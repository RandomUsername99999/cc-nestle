import os
from django.core.wsgi import get_wsgi_application

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')

# This is the entry point for Vercel
app = get_wsgi_application()
