import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from rest_framework.test import APIClient

try:
    client = APIClient()
    # 1. Get token
    resp1 = client.post('/api/token/', {'username': 'manager_john', 'password': 'password123'}, format='json')
    if resp1.status_code == 200:
        access_token = resp1.data['access']
        print("Got Token:", access_token[:20] + "...")
        
        # 2. Use token
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + access_token)
        resp2 = client.get('/api/me/')
        print("Status:", resp2.status_code)
        if resp2.status_code != 200:
            import re
            html = resp2.content.decode('utf-8')
            match = re.search(r'<title>(.*?)ValueError(.*?)Exception', html, re.IGNORECASE)
            print("Error extract:", html[:1000])
    else:
        print("Failed to get token:", resp1.content)
        
except Exception as e:
    import traceback
    traceback.print_exc()
