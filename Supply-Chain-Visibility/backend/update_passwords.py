import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.models import CustomUser
from django.contrib.auth.hashers import make_password

hash_pwd = make_password('password123')
users_count = CustomUser.objects.all().update(password=hash_pwd)

print(f"Successfully fixed {users_count} user hashes to 'password123'")
