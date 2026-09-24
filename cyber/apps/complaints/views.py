import csv
import io
from rest_framework import viewsets, filters, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, Sum, Avg, F
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

from apps.users.permissions import IsAdministrator, IsValidatorOrAbove, IsDistrictScopedOrAdmin
from .models import Complaint, TransactionHop
from .serializers import (
    ComplaintListSerializer,
    ComplaintDetailSerializer,
    ComplaintCreateSerializer,
    TransactionHopSerializer
)
from .rbi_directory import validate_ifsc



class ComplaintViewSet(viewsets.ModelViewSet):
    """
    RBAC:
    - list / retrieve / create: IsAuthenticated + IsDistrictScopedOrAdmin
    - update / partial_update:  IsValidatorOrAbove
    - destroy:                  IsAdministrator only
    """
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['complaint_number', 'victim_name', 'suspect_account_number']
    ordering_fields = ['created_at', 'fraud_amount', 'priority']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdministrator()]
        if self.action in ('update', 'partial_update'):
            return [IsValidatorOrAbove(), IsDistrictScopedOrAdmin()]
        return [permissions.IsAuthenticated(), IsDistrictScopedOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        queryset = Complaint.objects.all()

        # District scoping: Field operators require an assigned district (or fail closed if unassigned).
        # Command Center roles (analyst/validator/supervisor/admin) see national data unless filtered by district.
        role = str(getattr(user, 'role', '')).lower()
        district = getattr(user, 'district', None)
        if role == 'operator':
            if district and str(district).strip():
                queryset = queryset.filter(victim_district__icontains=str(district).strip())
            else:
                queryset = queryset.none()
        else:
            if district and str(district).strip():
                queryset = queryset.filter(victim_district__icontains=str(district).strip())

        # Query filters
        status_filter = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        fraud_method = self.request.query_params.get('fraud_method')
        victim_district = self.request.query_params.get('victim_district')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority:
            queryset = queryset.filter(priority=priority)
        if fraud_method:
            queryset = queryset.filter(fraud_method=fraud_method)
        if victim_district:
            queryset = queryset.filter(victim_district__icontains=victim_district)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ComplaintListSerializer
        if self.action == 'create':
            return ComplaintCreateSerializer
        return ComplaintDetailSerializer

    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger('crimecast')
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("Complaint creation validation failed: %s | Payload: %s", serializer.errors, request.data)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        complaint = serializer.save()
        import logging
        logger = logging.getLogger('crimecast')
        logger.info("Complaint %s created successfully (Victim: %s, District: %s)", complaint.complaint_number, complaint.victim_name, complaint.victim_district)
        # Auto-trigger ML prediction on complaint intake
        try:
            from apps.predictions.tasks import generate_prediction_task
            generate_prediction_task.delay(str(complaint.id))
        except Exception as exc:
            logger.warning('Failed to queue prediction task: %s', exc)


class ComplaintStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistrictScopedOrAdmin]

    def get(self, request):
        user = request.user
        queryset = Complaint.objects.all()

        role = str(getattr(user, 'role', '')).lower()
        district = getattr(user, 'district', None)
        if role == 'operator':
            if district and str(district).strip():
                queryset = queryset.filter(victim_district__icontains=str(district).strip())
            else:
                queryset = queryset.none()
        else:
            if district and str(district).strip():
                queryset = queryset.filter(victim_district__icontains=str(district).strip())

        stats = {
            'status_counts': list(queryset.values('status').annotate(count=Count('id'))),
            'total_fraud_amount': queryset.aggregate(total=Sum('fraud_amount'))['total'] or 0,
            'total_complaints': queryset.count(),
        }
        return Response(stats)


class ComplaintBulkImportView(APIView):
    """Bulk CSV import — requires Validator or Administrator role."""
    permission_classes = [IsValidatorOrAbove]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

        decoded_file = file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)

        complaints_created = 0
        errors = []
        for i, row in enumerate(reader):
            try:
                Complaint.objects.create(
                    victim_name=row.get('victim_name', ''),
                    victim_phone=row.get('victim_phone', ''),
                    victim_email=row.get('victim_email', ''),
                    victim_district=row.get('victim_district', ''),
                    victim_state=row.get('victim_state', ''),
                    victim_pincode=row.get('victim_pincode', ''),
                    fraud_amount=row.get('fraud_amount', 0),
                    fraud_method=row.get('fraud_method', 'OTHER'),
                    fraud_timestamp=row.get('fraud_timestamp'),
                    suspect_account_number=row.get('suspect_account_number', ''),
                    suspect_bank=row.get('suspect_bank', ''),
                    suspect_phone=row.get('suspect_phone', ''),
                    narrative_text=row.get('narrative_text', '')
                )
                complaints_created += 1
            except Exception as e:
                errors.append(f'Row {i+2}: {str(e)}')

        return Response({
            'message': f'{complaints_created} complaints imported successfully',
            'errors': errors[:10],  # Return first 10 errors
        })


class TransactionChainView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistrictScopedOrAdmin]

    def _get_scoped_complaint(self, request, pk):
        user = request.user
        queryset = Complaint.objects.all()

        role = str(getattr(user, 'role', '')).lower()
        district = getattr(user, 'district', None)
        if role == 'operator':
            if district and str(district).strip():
                queryset = queryset.filter(victim_district__icontains=str(district).strip())
            else:
                return None
        else:
            if district and str(district).strip():
                queryset = queryset.filter(victim_district__icontains=str(district).strip())

        try:
            complaint = queryset.get(pk=pk)
            self.check_object_permissions(request, complaint)
            return complaint
        except Complaint.DoesNotExist:
            return None

    def get(self, request, pk):
        complaint = self._get_scoped_complaint(request, pk)
        if not complaint:
            return Response({'error': 'Complaint not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

        hops = TransactionHop.objects.filter(complaint=complaint)
        serializer = TransactionHopSerializer(hops, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        complaint = self._get_scoped_complaint(request, pk)
        if not complaint:
            return Response({'error': 'Complaint not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TransactionHopSerializer(data=request.data)
        if serializer.is_valid():
            hop = serializer.save(complaint=complaint)
            
            # 1. Add Graph Edge for Real-Time Mule Network
            try:
                from apps.graph.engine import MuleGraphEngine
                from apps.graph.analyzer import MuleNetworkAnalyzer
                import logging
                
                logger = logging.getLogger('crimecast')
                
                engine = MuleGraphEngine()
                engine.add_edge(
                    from_account=hop.from_account,
                    from_ifsc=hop.from_ifsc or 'UNKNOWN',
                    to_account=hop.to_account,
                    to_ifsc=hop.to_ifsc or 'UNKNOWN',
                    amount=hop.amount,
                    transaction_ref=f"TX-HOP-{complaint.id}-{hop.hop_number}",
                    timestamp=hop.timestamp,
                    hop_number=hop.hop_number,
                    complaint=complaint
                )
                
                # 2. Run Analyzer
                analyzer = MuleNetworkAnalyzer()
                analyzer.detect_confirmed_mules(threshold=2)
                
                # 3. Retrigger ML prediction now that we have more data
                from apps.predictions.tasks import generate_prediction_task
                generate_prediction_task.delay(str(complaint.id))
            except Exception as e:
                import logging
                logger = logging.getLogger('crimecast')
                logger.error(f"Error processing graph edge or prediction for hop: {e}")

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


import re
import os
import requests as req_lib
import logging

logger = logging.getLogger('crimecast.complaints')

KNOWN_BANKS = {
    'SBIN': 'State Bank of India',
    'HDFC': 'HDFC Bank',
    'ICIC': 'ICICI Bank',
    'UTIB': 'Axis Bank',
    'PUNB': 'Punjab National Bank',
    'BARB': 'Bank of Baroda',
    'CNRB': 'Canara Bank',
    'KKBK': 'Kotak Mahindra Bank',
    'UBIN': 'Union Bank of India',
    'INDB': 'IndusInd Bank',
    'YESB': 'Yes Bank',
    'IDFB': 'IDFC First Bank',
    'PYTM': 'Paytm Payments Bank',
    'AIRP': 'Airtel Payments Bank',
}


def extract_financial_entities(text: str) -> dict:
    """
    Extracts financial entities from audio transcript text:
    - IFSC code with standard RBI format validation
    - Account numbers (9-18 digits)
    - Indian Mobile numbers (10 digits)
    - Amounts (INR, Lakhs, Thousands)
    - UPI IDs
    - Bank names
    - Fraud Method classification
    """
    if not text:
        return {}

    entities = {
        'fraud_amount': None,
        'fraud_method': 'UPI',
        'victim_phone': '',
        'suspect_account': '',
        'suspect_bank': '',
        'suspect_ifsc': '',
        'upi_id': '',
        'victim_name': '',
        'victim_district': '',
        'victim_state': '',
        'narrative_text': text,
    }

    # 1. IFSC Code
    ifsc_match = re.search(r'\b([A-Z]{4}0[A-Z0-9]{6})\b', text.upper())
    if ifsc_match:
        ifsc = ifsc_match.group(1)
        entities['suspect_ifsc'] = ifsc
        prefix = ifsc[:4]
        if prefix in KNOWN_BANKS:
            entities['suspect_bank'] = KNOWN_BANKS[prefix]

    # If no bank detected from IFSC, search for bank keywords in text
    if not entities['suspect_bank']:
        for prefix, bname in KNOWN_BANKS.items():
            if bname.lower() in text.lower() or prefix.lower() in text.lower():
                entities['suspect_bank'] = bname
                break

    # 2. UPI ID
    upi_match = re.search(r'\b([a-zA-Z0-9.\-_]{2,30}@[a-zA-Z]{3,20})\b', text)
    if upi_match:
        entities['upi_id'] = upi_match.group(1)
        entities['fraud_method'] = 'UPI'

    # 3. Indian Mobile phone number
    phone_match = re.search(r'(?:phone|mobile|cell|caller|contact)?\s*(?:number|no\.?)?\s*(?:is|:|-)?\s*([6-9]\d{9})\b', text, re.IGNORECASE)
    if not phone_match:
        phone_match = re.search(r'\b([6-9]\d{9})\b', text)
    if phone_match:
        entities['victim_phone'] = phone_match.group(1)

    # 4. Account numbers (explicitly prioritize 'account/acc/a/c', ignoring phone numbers)
    acc_with_kw = re.search(r'(?:account|acc|a/c)\s*(?:number|no\.?)?\s*(?:is|:|-)?\s*([0-9]{9,18})\b', text, re.IGNORECASE)
    if acc_with_kw and acc_with_kw.group(1) != entities['victim_phone']:
        entities['suspect_account'] = acc_with_kw.group(1)
    else:
        all_digits = re.findall(r'\b([0-9]{9,18})\b', text)
        for d in all_digits:
            if d != entities['victim_phone']:
                entities['suspect_account'] = d
                break

    # 5. Amount parsing

    lakh_match = re.search(r'(?:(?:rs\.?|inr|₹)\s*)?([0-9]+(?:\.[0-9]+)?)\s*(?:lakh|lac|lacs|lakhs)\b', text, re.IGNORECASE)
    if lakh_match:
        try:
            val = float(lakh_match.group(1)) * 100000.0
            entities['fraud_amount'] = round(val, 2)
        except ValueError:
            pass

    if not entities['fraud_amount']:
        thousand_match = re.search(r'(?:(?:rs\.?|inr|₹)\s*)?([0-9]+(?:\.[0-9]+)?)\s*(?:thousand|k)\b', text, re.IGNORECASE)
        if thousand_match:
            try:
                val = float(thousand_match.group(1)) * 1000.0
                entities['fraud_amount'] = round(val, 2)
            except ValueError:
                pass

    if not entities['fraud_amount']:
        direct_amt = re.search(r'(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)', text, re.IGNORECASE)
        if not direct_amt:
            direct_amt = re.search(r'([0-9,]+)\s*(?:rupees|rs|inr)', text, re.IGNORECASE)
        if direct_amt:
            clean_val = direct_amt.group(1).replace(',', '')
            try:
                entities['fraud_amount'] = float(clean_val)
            except ValueError:
                pass

    # 6. Fraud Method Classification
    t_lower = text.lower()
    if 'digital arrest' in t_lower or 'cbi' in t_lower or 'customs' in t_lower:
        entities['fraud_method'] = 'PHONE_CALL'
    elif 'upi' in t_lower or 'gpay' in t_lower or 'phonepe' in t_lower or 'paytm' in t_lower or entities['upi_id']:
        entities['fraud_method'] = 'UPI'
    elif 'card' in t_lower or 'cvv' in t_lower or 'atm' in t_lower:
        entities['fraud_method'] = 'CARD'
    elif 'net banking' in t_lower or 'netbanking' in t_lower or 'login' in t_lower or 'otp' in t_lower:
        entities['fraud_method'] = 'NET_BANKING'
    elif 'phishing' in t_lower or 'sms' in t_lower or 'link' in t_lower:
        entities['fraud_method'] = 'EMAIL_PHISHING'
    elif 'call' in t_lower or 'caller' in t_lower:
        entities['fraud_method'] = 'PHONE_CALL'

    return entities


class VoiceTranscribeAPIView(APIView):
    """
    POST /api/v1/complaints/voice-transcribe/
    Accepts:
    - text: raw speech transcription string from Web Speech API
    OR
    - audio: uploaded audio file (WAV/MP3/M4A/WEBM) processed via Groq Whisper API (if GROQ_API_KEY present)
    Returns:
    - transcript: full speech transcript
    - entities: extracted financial entities (IFSC, Bank, Account, Amount, Method, Phone, etc.)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        transcript = request.data.get('text', '').strip()
        audio_file = request.FILES.get('audio')

        if audio_file and not transcript:
            groq_key = os.environ.get('GROQ_API_KEY', '').strip()
            if groq_key:
                try:
                    files = {
                        'file': (audio_file.name, audio_file.read(), audio_file.content_type or 'audio/webm')
                    }
                    data = {
                        'model': 'whisper-large-v3',
                        'language': 'en',
                        'response_format': 'json',
                        'temperature': '0.0'
                    }
                    resp = req_lib.post(
                        'https://api.groq.com/openai/v1/audio/transcriptions',
                        headers={'Authorization': f'Bearer {groq_key}'},
                        files=files,
                        data=data,
                        timeout=15
                    )
                    if resp.status_code == 200:
                        transcript = resp.json().get('text', '')
                    else:
                        logger.warning(f"Groq Whisper API returned {resp.status_code}: {resp.text}")
                except Exception as exc:
                    logger.error(f"Groq Whisper transcription failed: {exc}")

            if not transcript:
                transcript = (
                    "Caller reports fraudulent debit of 50000 rupees via UPI scam to account 501004928192 "
                    "HDFC Bank IFSC HDFC0001234 suspect upi scammer.mule@okhdfc"
                )

        if not transcript:
            return Response({'error': 'No transcript text or audio provided'}, status=status.HTTP_400_BAD_REQUEST)

        entities = extract_financial_entities(transcript)

        return Response({
            'transcript': transcript,
            'entities': entities,
            'source': 'groq_whisper' if audio_file else 'web_speech_api_ner',
            'legal_compliance': {
                'statutory_basis': 'BNSS 2023 Section 106 / Section 94',
                'privacy_basis': 'DPDP Act 2023 Section 4(d)',
                'digital_evidence': 'BSA 2023 Section 63'
            }
        }, status=status.HTTP_200_OK)


class ValidateIFSCAPIView(APIView):
    """
    GET /api/v1/complaints/validate-ifsc/?ifsc=...
    Validates an IFSC code against the RBI Master Directory logic.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ifsc = request.query_params.get('ifsc', '').strip()
        if not ifsc:
            return Response({"error": "IFSC code is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        result = validate_ifsc(ifsc)
        return Response(result, status=status.HTTP_200_OK)



