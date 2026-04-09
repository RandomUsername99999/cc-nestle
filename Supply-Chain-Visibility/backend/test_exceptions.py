import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from django.test import RequestFactory
from api.models import CustomUser
from api.urls import current_user

try:
    user = CustomUser.objects.get(username='manager_john')
    request = RequestFactory().get('/api/me/')
    request.user = user
    
    resp = current_user(request)
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
