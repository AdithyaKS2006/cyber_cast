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

    def perform_create(self, serializer):
        complaint = serializer.save()
        # Auto-trigger ML prediction on complaint intake
        try:
            from apps.predictions.tasks import generate_prediction_task
            generate_prediction_task.delay(str(complaint.id))
        except Exception as exc:
            import logging
            logging.getLogger('crimecast').warning('Failed to queue prediction task: %s', exc)


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
            serializer.save(complaint=complaint)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

