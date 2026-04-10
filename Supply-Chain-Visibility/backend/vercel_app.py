import os
import sys

# Add the current directory to the path so Vercel can find the 'server' module
path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.append(path)

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')

# This is the WSGI entry point for Vercel
from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
