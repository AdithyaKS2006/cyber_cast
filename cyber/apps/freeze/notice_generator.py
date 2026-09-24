import hashlib
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY


def generate_bnss_106_notice_pdf(freeze_request) -> bytes:
    """
    Generates a formal, court-ready Statutory Notice under Section 106 & Section 94 of
    the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023.
    Digitally fingerprinted with a SHA-256 cryptographic hash under Section 63 of BSA 2023.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'NoticeTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#991b1b')  # Dark crimson
    )

    sub_title_style = ParagraphStyle(
        'NoticeSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1f2937')
    )

    legal_head_style = ParagraphStyle(
        'LegalHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1e3a8a')  # Dark blue
    )

    body_style = ParagraphStyle(
        'NoticeBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor('#111827')
    )

    body_bold = ParagraphStyle(
        'NoticeBodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#111827')
    )

    mono_style = ParagraphStyle(
        'NoticeMono',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#374151')
    )

    elements = []

    # 1. Header Emblem text
    elements.append(Paragraph("GOVERNMENT OF INDIA / STATE CYBER CRIME COMMAND CENTER", title_style))
    elements.append(Paragraph("INDIAN CYBER CRIME COORDINATION CENTRE (I4C) · INTER-AGENCY FRAUD INTERDICTION", sub_title_style))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#991b1b'), spaceAfter=8))

    # 2. Statutory Legal Citation
    elements.append(Paragraph(
        "STATUTORY FREEZING ORDER UNDER SECTION 106 READ WITH SECTION 94 OF<br/>"
        "THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023<br/>"
        "<font size=8 color='#4b5563'>[Replaces Section 91 & Section 102 of the Code of Criminal Procedure, 1973]</font>",
        legal_head_style
    ))
    elements.append(Spacer(1, 8))

    # 3. Metadata Table
    complaint_ref = "N/A"
    if freeze_request.complaint:
        complaint_ref = getattr(freeze_request.complaint, 'complaint_number', str(freeze_request.complaint.id))
    elif freeze_request.proactive_alert:
        complaint_ref = freeze_request.proactive_alert.alert_id

    req_time = freeze_request.requested_at.strftime("%Y-%m-%d %H:%M:%S UTC") if freeze_request.requested_at else datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    meta_data = [
        [
            Paragraph("<b>Directive Reference:</b>", body_style),
            Paragraph(f"BNSS-106-{str(freeze_request.id)[:8].upper()}", mono_style),
            Paragraph("<b>Issuance Timestamp:</b>", body_style),
            Paragraph(req_time, mono_style)
        ],
        [
            Paragraph("<b>NCRP / Case Reference:</b>", body_style),
            Paragraph(complaint_ref, mono_style),
            Paragraph("<b>I4C Gateway ID:</b>", body_style),
            Paragraph(freeze_request.i4c_freeze_id or "I4C-CFCFRMS-DIR-EXEC", mono_style)
        ],
        [
            Paragraph("<b>Target Bank:</b>", body_style),
            Paragraph(freeze_request.target_bank_name or "Scheduled Commercial Bank", body_bold),
            Paragraph("<b>Interdiction Window:</b>", body_style),
            Paragraph(f"{freeze_request.cash_out_eta_minutes} Minutes (Urgent)", body_bold)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[120, 140, 120, 140])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # 4. Target Beneficiary Account Details Table
    target_acc_clean = freeze_request.target_account
    amount_str = f"INR {float(freeze_request.freeze_amount):,.2f}"

    elements.append(Paragraph("<b>TARGET BENEFICIARY ACCOUNT SCHEDULE</b>", body_bold))
    elements.append(Spacer(1, 4))

    sched_data = [
        ["Beneficiary Account Number", "Bank IFSC Code", "Institution Name", "Lien / Freeze Amount", "Status"],
        [
            target_acc_clean,
            freeze_request.target_bank_ifsc or "N/A",
            freeze_request.target_bank_name or "Bank",
            amount_str,
            freeze_request.status
        ]
    ]
    sched_table = Table(sched_data, colWidths=[130, 95, 125, 100, 70])
    sched_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#eff6ff')),
        ('FONTNAME', (0, 1), (-1, 1), 'Courier-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 8.5),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#93c5fd')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(sched_table)
    elements.append(Spacer(1, 10))

    # 5. Formal Legal Directive Text
    legal_text_1 = (
        "<b>WHEREAS</b>, actionable cyber telemetry, financial trail graph analysis, and AI cash-out forecasting "
        "have established that the aforementioned target account is actively operating as a mule/cash-out conduit "
        "in an ongoing cyber financial fraud offense punishable under <b>Section 318(4) of the Bharatiya Nyaya Sanhita (BNS), 2023</b> "
        "and <b>Section 66D of the Information Technology Act, 2000</b>."
    )
    elements.append(Paragraph(legal_text_1, body_style))
    elements.append(Spacer(1, 6))

    legal_text_2 = (
        "<b>NOW THEREFORE</b>, in exercise of statutory powers vested under <b>Section 106 read with Section 94 of the "
        "Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023</b>, you are hereby commanded and directed to:"
        "<br/>1. <b>IMMEDIATELY FREEZE ALL DEBIT TRANSACTIONS</b> and place a lien equal to <b>" + amount_str + "</b> on the target account."
        "<br/>2. Preserve all KYC records, IP access logs, associated UPI VPAs, and account opening documentation."
        "<br/>3. Transmit confirmation of compliance via the CrimeCast Nodal Gateway or Indian Cyber Crime Reporting Portal (I4C)."
    )
    elements.append(Paragraph(legal_text_2, body_style))
    elements.append(Spacer(1, 6))

    legal_text_3 = (
        "<b>STATUTORY PENAL WARNING:</b> Take notice that non-compliance or undue delay in executing this freezing requisition "
        "is punishable under <b>Section 223 of the Bharatiya Nyaya Sanhita (BNS), 2023</b> (disobedience to order duly promulgated by "
        "public servant) and relevant provisions of the Banking Regulation Act, 1949."
    )
    elements.append(Paragraph(legal_text_3, body_style))
    elements.append(Spacer(1, 10))

    # 6. Cryptographic Hash / BSA 2023 Section 63 Evidence Certificate
    raw_payload_str = f"{freeze_request.id}:{freeze_request.target_account}:{freeze_request.freeze_amount}:{freeze_request.target_bank_ifsc}:{req_time}"
    sha256_digest = hashlib.sha256(raw_payload_str.encode('utf-8')).hexdigest()

    cert_data = [
        [
            Paragraph(
                "<b>ELECTRONIC EVIDENCE CERTIFICATE (SECTION 63, BHARATIYA SAKSHYA ADHINIYAM, 2023)</b><br/>"
                "This document is an electronically generated statutory instrument produced in the ordinary course of cybercrime "
                "interdiction operations. The integrity of the automated record is cryptographically verified.<br/>"
                f"<b>SHA-256 Cryptographic Hash:</b> <font color='#1e3a8a'>{sha256_digest}</font><br/>"
                "<b>Privacy Compliance:</b> Law Enforcement exemption under Section 4(d) of Digital Personal Data Protection Act, 2023.",
                mono_style
            )
        ]
    ]
    cert_table = Table(cert_data, colWidths=[520])
    cert_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#9ca3af')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(cert_table)
    elements.append(Spacer(1, 14))

    # 7. Signature / Seal footer
    sig_data = [
        [
            Paragraph(
                "<b>CrimeCast AI Interdiction Engine</b><br/>"
                "Autonomous Nodal Interception Gateway<br/>"
                "National Cyber Crime Reporting Portal (NCRP)",
                body_style
            ),
            Paragraph(
                "<b>Digitally Signed & Validated</b><br/>"
                "Authorized Cyber Operations Specialist<br/>"
                "State Cyber Crime Investigation Division",
                body_style
            )
        ]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(sig_table)

    # Build PDF
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
