import os
import sys
import traceback

# Add the current directory to the path so Vercel can find the 'server' module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from django.core.wsgi import get_wsgi_application

    # Set the Django settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')

    # This is the entry point for Vercel
    app = get_wsgi_application()
    print("Django application loaded successfully.")
    
except Exception as e:
    print("CRITICAL: Django application failed to load!")
    print(traceback.format_exc())
    # Re-raise so Vercel knows it failed, but now we have the logs
    raise e
