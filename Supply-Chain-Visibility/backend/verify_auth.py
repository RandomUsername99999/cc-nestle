import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.models import CustomUser
from django.contrib.auth import authenticate

def verify():
    u = CustomUser.objects.filter(username='superadmin').first()
    if not u:
        print("User superadmin not found")
        return
    
    print(f"User: {u.username}")
    print(f"Email: {u.email}")
    print(f"Role: {u.role.role_name}")
    print(f"Active: {u.is_active}")
    print(f"Password Hash: {u.password[:20]}...")
    
    # Manual check
    match = u.check_password('password123')
    print(f"Manual check match: {match}")
    
    # Auth check
    user = authenticate(username='superadmin', password='password123')
    print(f"Authenticate result: {user is not None}")

if __name__ == '__main__':
    verify()
