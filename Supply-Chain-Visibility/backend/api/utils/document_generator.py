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

def draw_logo(p, x, y, size=50):
    """ Draw the Nestle logo from local assets. """
    import os
    # Path relative to this file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    logo_path = os.path.join(base_dir, "..", "assets", "logo.png")
    
    if os.path.exists(logo_path):
        # Draw a subtle background for the logo to make it pop
        p.setFillColor(colors.white)
        p.roundRect(x - 5, y - 5, size + 10, size + 10, 8, stroke=0, fill=1)
        p.drawImage(logo_path, x, y, width=size, height=size, mask='auto')
    else:
        # Fallback stylized text logo
        p.setFillColor(colors.HexColor('#3b82f6'))
        p.setFont("Helvetica-Bold", 16)
        p.drawString(x, y + 15, "CC")
        p.setFillColor(colors.whitesmoke)
        p.drawString(x + 25, y + 15, "NESTLE")

def draw_header(p, width, height, title, subtitle="Logistics Management System"):
    # Modern Gradient-like Header Bar
    p.setFillColor(colors.HexColor('#0f172a')) # Slate 900
    p.rect(0, height - 100, width, 100, stroke=0, fill=1)
    
    # Blue Accent Bar
    p.setFillColor(colors.HexColor('#2563eb')) # Blue 600
    p.rect(0, height - 105, width, 5, stroke=0, fill=1)
    
    # Draw Logo
    draw_logo(p, 40, height - 80, size=60)
    
    # Title - Limit width to prevent overlap
    p.setFillColor(colors.whitesmoke)
    p.setFont("Helvetica-Bold", 18)
    # If title is too long, it will be truncated or we can use a smaller font
    display_title = title.upper()
    if len(display_title) > 25:
        p.setFont("Helvetica-Bold", 14)
    p.drawString(120, height - 55, display_title)
    
    # Subtitle
    p.setFont("Helvetica", 10)
    p.setFillColor(colors.HexColor('#94a3b8')) # Slate 400
    p.drawString(120, height - 72, subtitle)
    
    # Metadata (Date/Ref) - Moved further right and styled
    p.setFillColor(colors.whitesmoke)
    p.setFont("Helvetica-Bold", 8)
    p.drawRightString(width - 40, height - 45, f"REPORT DATE: {timezone.now().strftime('%d %b %Y')}")
    p.setFont("Helvetica", 8)
    p.setFillColor(colors.HexColor('#cbd5e1')) # Slate 300
    p.drawRightString(width - 40, height - 60, f"SYSTEM REF: {timezone.now().strftime('%H%M%S-%d%m')}")


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

def draw_signature(p, x, y, base64_str, width=150, height=60):
    """ Decode base64 signature and draw it on the canvas. """
    if not base64_str:
        return y
    
    import base64
    from io import BytesIO
    from reportlab.lib.utils import ImageReader
    
    try:
        # Handle potential data:image/png;base64, prefix
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
            
        img_data = base64.b64decode(base64_str)
        img = ImageReader(BytesIO(img_data))
        
        # Background for signature
        p.setFillColor(colors.whitesmoke)
        p.roundRect(x, y - height, width, height, 4, stroke=1, fill=1)
        
        p.drawImage(img, x + 5, y - height + 5, width=width - 10, height=height - 10, mask='auto')
        return y - height - 10
    except Exception as e:
        print(f"Failed to draw signature: {e}")
        return y

def draw_delivery_map(p, x, y, lat, lng, width=200, height=120):
    """ Draw a static Google Map image for the delivery location. """
    # Placeholder API Key - User should replace with their own
    API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"
    
    if not lat or not lng:
        return y
        
    static_map_url = f"https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom=15&size={width}x{height}&markers=color:red%7C{lat},{lng}&key={API_KEY}"
    
    try:
        p.setStrokeColor(colors.HexColor('#e2e8f0'))
        p.roundRect(x, y - height, width, height, 8, stroke=1, fill=0)
        
        # If API_KEY is placeholder, this will fail or show error image
        p.drawImage(static_map_url, x, y - height, width=width, height=height, mask='auto')
        return y - height - 10
    except Exception:
        # Fallback stylized placeholder
        p.setFillColor(colors.HexColor('#f8fafc'))
        p.roundRect(x, y - height, width, height, 8, stroke=1, fill=1)
        p.setFillColor(colors.HexColor('#94a3b8'))
        p.setFont("Helvetica-Bold", 8)
        p.drawCentredString(x + width/2, y - height/2, "GEOSPATIAL PROOF")
        p.setFont("Helvetica", 7)
        p.drawCentredString(x + width/2, y - height/2 - 12, f"LAT: {lat} / LNG: {lng}")
        return y - height - 10

