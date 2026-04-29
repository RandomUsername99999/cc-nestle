from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.legends import Legend
from reportlab.lib.units import inch
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

def draw_logo(p, x, y, size=40):
    """ Draw the Nestle logo if available, fallback to text logo. """
    import os
    # Use the correct path from mobile assets as specified
    logo_path = r"c:\ccProject\Mobile-Interface\assets\images\logo.png"
    if os.path.exists(logo_path):
        p.drawImage(logo_path, x, y, width=size, height=size, mask='auto')
    else:
        # Fallback stylized text logo
        p.setFillColor(colors.HexColor('#3b82f6'))
        p.setFont("Helvetica-Bold", 14)
        p.drawString(x, y + 15, "CC")
        p.setFillColor(colors.whitesmoke)
        p.drawString(x + 20, y + 15, "NESTLE")

def draw_header(p, width, height, title, subtitle="Logistics Management System"):
    # Modern Gradient-like Header Bar (Fixed height for better spacing)
    p.setFillColor(colors.HexColor('#1e293b')) # Dark slate 800
    p.rect(0, height - 100, width, 100, stroke=0, fill=1)
    
    # Accent Line
    p.setFillColor(colors.HexColor('#3b82f6')) # Blue 500
    p.rect(0, height - 102, width, 2, stroke=0, fill=1)
    
    # Draw Logo (Adjusted position)
    draw_logo(p, 40, height - 70, size=50)
    
    p.setFillColor(colors.whitesmoke)
    p.setFont("Helvetica-Bold", 20)
    p.drawString(110, height - 50, title.upper())
    
    p.setFont("Helvetica", 9)
    p.setFillColor(colors.HexColor('#94a3b8')) # Slate 400
    p.drawString(110, height - 68, subtitle)
    
    p.setFillColor(colors.whitesmoke)
    p.setFont("Helvetica-Bold", 8)
    p.drawString(width - 180, height - 45, f"REPORT DATE: {timezone.now().strftime('%d %b %Y')}")
    p.setFont("Helvetica", 8)
    p.drawString(width - 180, height - 58, f"SYSTEM REF: {timezone.now().strftime('%H%M%S-%d%m')}")


def draw_kpi_card(p, x, y, label, value, color="#3b82f6"):
    # Shadow effect
    p.setFillColor(colors.HexColor('#f1f5f9'))
    p.roundRect(x + 2, y - 2, 120, 65, 6, stroke=0, fill=1)
    
    p.setStrokeColor(colors.HexColor('#e2e8f0'))
    p.setFillColor(colors.white)
    p.roundRect(x, y, 120, 65, 6, stroke=1, fill=1)
    
    p.setFillColor(colors.HexColor('#64748b'))
    p.setFont("Helvetica-Bold", 8)
    p.drawString(x + 15, y + 45, label.upper())
    
    p.setFillColor(colors.HexColor(color))
    p.setFont("Helvetica-Bold", 16)
    p.drawString(x + 15, y + 18, str(value))

def draw_bar_chart(p, x, y, width, height, data, labels, title="Performance Trend"):
    drawing = Drawing(width, height)
    bc = VerticalBarChart()
    bc.x = 40
    bc.y = 20
    bc.height = height - 40
    bc.width = width - 60
    bc.data = data
    bc.strokeColor = colors.HexColor('#e2e8f0')
    bc.valueAxis.valueMin = 0
    bc.valueAxis.labels.fontName = 'Helvetica'
    bc.valueAxis.labels.fontSize = 8
    bc.categoryAxis.labels.fontName = 'Helvetica'
    bc.categoryAxis.labels.fontSize = 8
    bc.categoryAxis.categoryNames = labels
    bc.bars[0].fillColor = colors.HexColor('#3b82f6') # Successful
    if len(data) > 1:
        bc.bars[1].fillColor = colors.HexColor('#ef4444') # Failed
    
    drawing.add(bc)
    
    p.setFont("Helvetica-Bold", 10)
    p.setFillColor(colors.HexColor('#334155'))
    p.drawString(x + 40, y + height + 5, title)
    
    drawing.drawOn(p, x, y)
    return y - 20

def draw_pie_chart(p, x, y, width, height, data, labels, title="Distribution"):
    drawing = Drawing(width, height)
    pc = Pie()
    pc.x = 20
    pc.y = 20
    pc.width = height - 40
    pc.height = height - 40
    pc.data = data
    pc.labels = labels
    pc.sideLabels = 1
    pc.slices.strokeWidth = 0.5
    
    # Custom colors
    chart_colors = [colors.HexColor('#3b82f6'), colors.HexColor('#ef4444'), 
                    colors.HexColor('#f59e0b'), colors.HexColor('#10b981'), 
                    colors.HexColor('#8b5cf6')]
    for i, color in enumerate(chart_colors):
        if i < len(pc.slices):
            pc.slices[i].fillColor = color

    drawing.add(pc)
    
    p.setFont("Helvetica-Bold", 10)
    p.setFillColor(colors.HexColor('#334155'))
    p.drawString(x + 20, y + height + 5, title)
    
    drawing.drawOn(p, x, y)
    return y - 20

def draw_status_pill(p, x, y, text, type='success'):
    color_map = {
        'success': ('#dcfce7', '#166534'),
        'warning': ('#fef9c3', '#854d0e'),
        'danger': ('#fee2e2', '#991b1b'),
        'info': ('#e0f2fe', '#075985'),
        'active': ('#dcfce7', '#166534'),
        'standby': ('#f1f5f9', '#475569')
    }
    bg, fg = color_map.get(type.lower(), color_map['info'])
    
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
        ('TOPPADDING', (0,0), (-1,0), 10),
        ('BACKGROUND', (0,1), (-1,-1), colors.white),
        ('TEXTCOLOR', (0,1), (-1,-1), colors.HexColor('#334155')),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')])
    ])
    t.setStyle(style)
    t.wrapOn(p, width, 1000)
    table_height = len(data) * 25 # Estimate
    t.drawOn(p, x, y - table_height)
    return y - table_height - 30

