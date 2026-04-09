import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")
django.setup()

from api.models import CustomUser, Role

# 1. Create Roles
roles = [
    ('admin', 'Direct control over all system functions'),
    ('manager', 'Manage vehicles and assignments'),
    ('dispatcher', 'Dispatch shipments and track drivers'),
    ('driver', 'Driver access for delivery tracking'),
    ('customer', 'Customer access for shipment tracking'),
]

role_objs = {}
for name, desc in roles:
    role, created = Role.objects.get_or_create(role_name=name, defaults={'role_description': desc})
    role_objs[name] = role
    if created:
        print(f"Created role: {name}")

# 2. Create Users
users_to_create = [
    {'username': 'superadmin', 'email': 'admin@logistics.com', 'role_name': 'admin', 'password': 'password123'},
    {'username': 'manager_john', 'email': 'john@logistics.com', 'role_name': 'manager', 'password': 'password123'},
    {'username': 'dispatch_sarah', 'email': 'sarah@logistics.com', 'role_name': 'dispatcher', 'password': 'password123'},
    {'username': 'driver_mike', 'email': 'mike@logistics.com', 'role_name': 'driver', 'password': 'password123'},
]

for user_data in users_to_create:
    username = user_data['username']
    role_name = user_data.pop('role_name')
    password = user_data.pop('password')
    
    if not CustomUser.objects.filter(username=username).exists():
        user = CustomUser.objects.create_user(password=password, role=role_objs[role_name], **user_data)
        print(f"Created user: {username} ({role_name})")
    else:
        user = CustomUser.objects.get(username=username)
        user.set_password(password)
        user.role = role_objs[role_name]
        user.save()
        print(f"Updated user: {username}")
