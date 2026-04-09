import os
import django
import sys
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken

try:
    auth = JWTAuthentication()
    
    from api.models import CustomUser
    user = CustomUser.objects.get(username='manager_john')
    token = AccessToken.for_user(user)
    
    with open('debug_output.txt', 'w', encoding='utf-8') as f:
        f.write(f"Token user ID: {token['user_id']}\n")
    
    # 2. Get user from token
    retrieved_user = auth.get_user(token)
    
    with open('debug_output.txt', 'a', encoding='utf-8') as f:
        f.write(f"Retrieved User: {retrieved_user}\n")

except Exception as e:
    with open('debug_output.txt', 'a', encoding='utf-8') as f:
        traceback.print_exc(file=f)
