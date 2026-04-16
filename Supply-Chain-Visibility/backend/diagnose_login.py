import os
import django
import sys

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
try:
    django.setup()
except Exception as e:
    print(f"FAILED TO SETUP DJANGO: {e}")
    sys.exit(1)

from api.models import CustomUser, Role
from django.contrib.auth import authenticate

def diagnose_login(identifier, password):
    print(f"--- DIAGNOSING LOGIN FOR: {identifier} ---")
    
    # 1. Lookup User
    user = CustomUser.objects.filter(email__iexact=identifier).first() or \
           CustomUser.objects.filter(username=identifier).first()
    
    if not user:
        print(f"ERROR: No user found with username or email '{identifier}'")
        print("Available usernames in DB:")
        for u in CustomUser.objects.all()[:10]:
            print(f"  - {u.username} ({u.email})")
        return

    print(f"User Found: {user.username}")
    print(f"Email: {user.email}")
    print(f"Is Active: {user.is_active}")
    print(f"Is Staff: {getattr(user, 'is_staff', 'MISSING FIELD')}")
    print(f"Role: {user.role.role_name if user.role else 'NO ROLE'}")

    # 2. Try authenticate
    print(f"Attempting authenticate(username='{user.username}', password='{password}')...")
    auth_user = authenticate(username=user.username, password=password)
    
    if auth_user:
        print("SUCCESS: Credentials are correct!")
    else:
        print("FAILURE: Authentication failed. This usually means the password does not match the hash in the DB.")
        # Check if the password was set correctly
        # make_password('admin123') = ...
        print("Note: If you reset the password using scripts, make sure you used make_password() or user.set_password().")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python diagnose_login.py <username_or_email> <password>")
    else:
        diagnose_login(sys.argv[1], sys.argv[2])
