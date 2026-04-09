import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.models import CustomUser, Role

def seed_admin():
    # 1. Ensure 'admin' role exists
    admin_role, created = Role.objects.get_or_create(
        role_name='admin',
        defaults={'role_description': 'System administrator with full access'}
    )
    if created:
        print("Admin role created.")

    # 2. Check if superadmin exists
    if not CustomUser.objects.filter(username='superadmin').exists():
        user = CustomUser.objects.create_user(
            username='superadmin',
            email='admin@logistics.com',
            password='password123',
            role=admin_role,
            is_active=True
        )
        print("Superadmin user created successfully.")
    else:
        # Update password just in case
        user = CustomUser.objects.get(username='superadmin')
        user.set_password('password123')
        user.is_active = True
        user.save()
        print("Superadmin user password updated and account activated.")

if __name__ == '__main__':
    seed_admin()
