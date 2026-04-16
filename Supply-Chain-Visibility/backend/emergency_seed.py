import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from django.core.management import call_command
from api.models import CustomUser, Role, Employee
from datetime import date

def seed():
    print("Running migrations...")
    call_command('migrate', interactive=False)
    
    # 1. Create ALL four roles (including Dispatcher which was previously missing)
    print("Creating roles...")
    admin_role, _ = Role.objects.get_or_create(role_name='Admin')
    driver_role, _ = Role.objects.get_or_create(role_name='Driver')
    manager_role, _ = Role.objects.get_or_create(role_name='Manager')
    dispatcher_role, _ = Role.objects.get_or_create(role_name='Dispatcher')
    print(f"  Roles: Admin={admin_role.role_id}, Driver={driver_role.role_id}, Manager={manager_role.role_id}, Dispatcher={dispatcher_role.role_id}")
    
    # 2. Create superadmin
    print("Creating superadmin...")
    user_mgr = CustomUser.objects
    print(f"  Manager debug: {type(user_mgr)}")
    
    if not CustomUser.objects.filter(username='superadmin').exists():
        # Fallback if the custom manager is not correctly linked for some reason
        if not hasattr(user_mgr, 'create_user'):
             print("  WARNING: Custom manager missing create_user. Using CustomUserManager directly.")
             from api.models import CustomUserManager
             user_mgr = CustomUserManager()
             user_mgr.model = CustomUser

        user = user_mgr.create_user(
            username='superadmin',
            email='admin@logistics.com',
            password='admin123',
            role=admin_role
        )
        user.is_superuser = True
        user.is_staff = True
        user.save()
        Employee.objects.get_or_create(
            user=user,
            defaults={'full_name': 'System Administrator', 'national_id': '200012345678', 'contact_number': '0771234567', 'address': 'HQ Office', 'date_of_birth': date(1990, 1, 1)}
        )
        print("  superadmin / admin123 (Admin)")
    else:
        print("  Superadmin already exists.")
    
    # 3. Create test users for each role
    test_users = [
        {'username': 'manager1', 'email': 'manager@logistics.com', 'password': 'manager123', 'role': manager_role, 'full_name': 'Test Manager'},
        {'username': 'dispatcher1', 'email': 'dispatcher@logistics.com', 'password': 'dispatcher123', 'role': dispatcher_role, 'full_name': 'Test Dispatcher'},
        {'username': 'driver1', 'email': 'driver@logistics.com', 'password': 'driver123', 'role': driver_role, 'full_name': 'Test Driver'},
    ]
    
    for u in test_users:
        if not CustomUser.objects.filter(username=u['username']).exists():
            user = user_mgr.create_user(
                username=u['username'],
                email=u['email'],
                password=u['password'],
                role=u['role']
            )
            Employee.objects.get_or_create(
                user=user,
                defaults={'full_name': u['full_name'], 'national_id': '200012340000', 'contact_number': '0770000000', 'address': 'Office', 'date_of_birth': date(1995, 6, 15)}
            )
            print(f"  {u['username']} / {u['password']} ({u['role'].role_name})")
            
            # Create DriverProfile for driver users
            if u['role'] == driver_role:
                from drivers.models import Driver as DriverProfile
                emp = Employee.objects.get(user=user)
                DriverProfile.objects.get_or_create(
                    employee=emp,
                    defaults={'license_number': 'DL-TEST-001', 'license_expiry_date': date(2028, 12, 31), 'license_type': 'Heavy', 'experience_years': 3}
                )
                print(f"    -> Driver profile created for {u['username']}")
        else:
            print(f"  {u['username']} already exists.")
    
    print("\n[OK] Seed complete. All 4 roles are available.")
    print("  Login credentials:")
    print("  superadmin / admin123   (Admin - Dashboard)")
    print("  manager1 / manager123   (Manager - Dashboard)")
    print("  dispatcher1 / dispatcher123 (Dispatcher - Dashboard)")
    print("  driver1 / driver123     (Driver - Mobile only)")

if __name__ == "__main__":
    seed()
