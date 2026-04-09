import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.models import CustomUser
from api.serializers import UserSerializer

try:
    user = CustomUser.objects.get(username='manager_john')
    serializer = UserSerializer(user)
    print("Serialization data:", dict(serializer.data))
except Exception as e:
    import traceback
    traceback.print_exc()
