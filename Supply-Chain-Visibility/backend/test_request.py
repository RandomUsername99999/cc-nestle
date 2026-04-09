import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from rest_framework.test import APIClient
from api.models import CustomUser

try:
    user = CustomUser.objects.get(username='manager_john')
    client = APIClient()
    client.force_authenticate(user=user)
    
    response = client.get('/api/me/')
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Content: {response.content}")
except Exception as e:
    import traceback
    traceback.print_exc()
