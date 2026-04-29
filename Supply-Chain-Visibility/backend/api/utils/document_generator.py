from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.pdfgen import canvas
from io import BytesIO
from django.http import HttpResponse
from django.utils import timezone

def generate_pdf_response(filename, content_callback):
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    content_callback(p, width, height)
    
    p.showPage()
    p.save()
    
    pdf_data = buffer.getvalue()
    buffer.close()
    
    response = HttpResponse(pdf_data, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
    return response

def draw_header(p, width, height, title, subtitle="Logistics Management System"):
    # Dark Header Bar
    p.setFillColor(colors.HexColor('#0f172a'))
    p.rect(0, height - 80, width, 80, stroke=0, fill=1)
    
    p.setFillColor(colors.whitesmoke)
    p.setFont("Helvetica-Bold", 18)
    p.drawString(50, height - 40, title.upper())
    
    p.setFont("Helvetica", 9)
    p.drawString(50, height - 55, subtitle)
    p.drawString(width - 200, height - 40, f"DATE: {timezone.now().strftime('%Y-%m-%d')}")
    p.drawString(width - 200, height - 55, f"REF: {timezone.now().strftime('%H%M%S')}")

def draw_kpi_card(p, x, y, label, value, color="#3b82f6"):
    p.setStrokeColor(colors.HexColor('#e2e8f0'))
    p.setFillColor(colors.white)
    p.roundRect(x, y, 120, 60, 4, stroke=1, fill=1)
    
    p.setFillColor(colors.HexColor('#64748b'))
    p.setFont("Helvetica-Bold", 8)
    p.drawString(x + 10, y + 40, label.upper())
    
    p.setFillColor(colors.HexColor(color))
    p.setFont("Helvetica-Bold", 14)
    p.drawString(x + 10, y + 15, str(value))

def draw_status_pill(p, x, y, text, type='success'):
    color_map = {
        'success': ('#dcfce7', '#166534'),
        'warning': ('#fef9c3', '#854d0e'),
        'danger': ('#fee2e2', '#991b1b'),
        'info': ('#e0f2fe', '#075985')
    }
    bg, fg = color_map.get(type, color_map['info'])
    
    p.setFillColor(colors.HexColor(bg))
    p.roundRect(x, y, 60, 15, 7, stroke=0, fill=1)
    
    p.setFillColor(colors.HexColor(fg))
    p.setFont("Helvetica-Bold", 7)
    p.drawCentredString(x + 30, y + 5, text.upper())

def draw_styled_table(p, x, y, width, data, header_color='#1e293b'):
    t = Table(data, colWidths=[width/len(data[0])] * len(data[0]))
    style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor(header_color)),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 10),
        ('BACKGROUND', (0,1), (-1,-1), colors.white),
        ('TEXTCOLOR', (0,1), (-1,-1), colors.HexColor('#334155')),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ])
    t.setStyle(style)
    t.wrapOn(p, width, 500)
    t.drawOn(p, x, y - (len(data) * 20))
    return y - (len(data) * 20) - 20
