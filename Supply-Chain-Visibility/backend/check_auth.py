import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.models import CustomUser
from django.contrib.auth import authenticate

try:
    user = CustomUser.objects.get(username='manager_john')
    print("User found!")
    print("Database Hash:", user.password)
    print("Is Active?", user.is_active)
    
    # Try authentication
    auth_user = authenticate(username='manager_john', password='password123')
    if auth_user:
        print("AUTHENTICATION SUCCESSFUL!")
    else:
        print("AUTHENTICATION FAILED!")
        
except Exception as e:
    print("Error:", e)
