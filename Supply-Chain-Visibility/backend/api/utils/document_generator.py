from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
from django.http import HttpResponse
from django.utils import timezone

def generate_pdf_response(filename, content_callback):
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    content_callback(p, width, height)
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
    return response

def draw_header(p, width, height, title):
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, height - 50, title)
    p.setFont("Helvetica", 10)
    p.drawString(100, height - 70, f"Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
    p.line(100, height - 80, width - 100, height - 80)

def draw_section(p, x, y, title, content_lines):
    p.setFont("Helvetica-Bold", 12)
    p.drawString(x, y, title)
    p.setFont("Helvetica", 10)
    current_y = y - 15
    for line in content_lines:
        p.drawString(x + 10, current_y, line)
        current_y -= 12
    return current_y - 10
