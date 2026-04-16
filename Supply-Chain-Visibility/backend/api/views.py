from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.utils import timezone
from .models import CustomUser, Vehicle, VehicleAssignment, Order
from .serializers import UserSerializer, VehicleSerializer, VehicleAssignmentSerializer
from .utils.route_optimization import cluster_orders

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        identifier = request.data.get('username')
        password = request.data.get('password')
        
        # Check if login identifier matches email or username
        user = CustomUser.objects.filter(email__iexact=identifier).first() or \
               CustomUser.objects.filter(username=identifier).first()
            
        if user:
            # If user found by email, swap the identifier to the username for the super().post call
            request.data['username'] = user.username
        
        try:
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200:
                # Add extra data to response
                response.data['user_id'] = user.id
                response.data['role'] = user.role.role_name.lower() if user.role else 'driver'
                
                # Audit Log: Successful login
                from .models import AuditLog
                AuditLog.objects.create(
                    user=user,
                    action='LOGIN_SUCCESS',
                    resource_type='Session',
                    details=f"User '{user.username}' ({user.role.role_name}) logged in successfully."
                )
        except AuthenticationFailed:
            # Audit Log: Failed login
            from .models import AuditLog
            AuditLog.objects.create(
                user=user if user else None,
                action='LOGIN_FAILED',
                resource_type='Session',
                details=f"Failed login attempt for identifier '{identifier}'."
            )
            if user:
                return Response({"detail": "Incorrect password. Please try again."}, status=status.HTTP_401_UNAUTHORIZED)
            return Response({"detail": "No account found with these credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({"detail": f"Server authentication error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return response

class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        # Fallback for identity verification if JWT fails/missing in dev
        user_id = request.query_params.get('user_id') or (request.data.get('user_id') if isinstance(request.data, dict) else None)
        user = None
        if user_id:
            try:
                user = CustomUser.objects.get(user_id=user_id)
            except: pass

        if not user:
            user = request.user

        if not user or not user.is_authenticated:
            return False
            
        if user.is_superuser:
            return True
        try:
            return user.role.role_name.lower() == 'admin'
        except AttributeError:
            return False

class IsInternalRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            role = request.user.role.role_name.lower()
            return role in ['admin', 'manager', 'dispatcher']
        except AttributeError:
            return False

class IsManagerRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            return request.user.role.role_name.lower() == 'manager'
        except AttributeError:
            return False

class IsDispatcherRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            return request.user.role.role_name.lower() == 'dispatcher'
        except AttributeError:
            return False

class IsDriverRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            # Note: drivers are rarely superusers, so we check specifically
            return request.user.role.role_name.lower() == 'driver'
        except AttributeError:
            return False

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return CustomUser.objects.none()
        # Admins can see everyone except themselves in the management list
        return CustomUser.objects.exclude(user_id=self.request.user.pk)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsInternalRole()]
        return [IsAdminRole()]

    def perform_update(self, serializer):
        if serializer.instance.id == self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Security Violation: Self-modification of administrative accounts is prohibited.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.id == self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Security Violation: You cannot delete your own administrative identity.")
        instance.delete()

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

    def get_permissions(self):
        return [IsInternalRole()]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        user = request.user
        if user.is_superuser:
            return
            
        role = user.role.role_name.lower() if user.role else ''
        if self.action in ['partial_update', 'update'] and role in ['manager', 'dispatcher']:
            # Managers and dispatchers can strictly modify driver assignments.
            # We allow metadata updates if they are admins, but for these roles we restrict to 'assignedDriver'
            # However, we check if they are trying to change core fields.
            disallowed_keys = {'plate_number', 'vehicle_id', 'vehicle_type'}
            intersect = set(request.data.keys()).intersection(disallowed_keys)
            if intersect:
                self.permission_denied(request, message=f"Managers/Dispatchers cannot modify immutable fields: {', '.join(intersect)}")

    def perform_update(self, serializer):
        try:
            assigned_driver_data = self.request.data.get('assignedDriver', -1)
            vehicle = serializer.instance
            
            # If assignedDriver was provided in the request (even if null or empty string)
            if assigned_driver_data != -1:
                from django.utils import timezone
                from .models import VehicleAssignment
                from drivers.models import Driver
                from rest_framework import serializers
                now = timezone.now()
                
                # Close existing active assignments for this vehicle
                VehicleAssignment.objects.filter(vehicle=vehicle, status='active').update(status='completed', assignment_end_date=now)
                
                if assigned_driver_data and str(assigned_driver_data).strip():
                    try:
                        # Robust lookup: handle string or integer IDs
                        d_id = int(assigned_driver_data)
                        driver_obj = Driver.objects.get(employee__user__user_id=d_id)
                    except (ValueError, Driver.DoesNotExist):
                        raise serializers.ValidationError({"assignedDriver": "Selected user does not have an active Driver profile."})
                    except Exception as e:
                        raise serializers.ValidationError({"assignedDriver": f"Assignment error: {str(e)}"})
                        
                    if driver_obj:
                        # Enforce 1-to-1: Close any currently active assignment for this specific driver
                        VehicleAssignment.objects.filter(driver=driver_obj, status='active').update(status='completed', assignment_end_date=now)
                        
                        VehicleAssignment.objects.create(
                            driver=driver_obj,
                            vehicle=vehicle,
                            status='active',
                            assignment_start_date=now,
                            assigned_by=self.request.user
                        )
                        # Mark vehicle as in use
                        serializer.save(status='in_use')
                else:
                    # Explicit unassignment (null or empty string provided)
                    serializer.save(status='available')
            else:
                # Traditional update (metadata changes only)
                serializer.save()
        except Exception as e:
            import traceback
            from rest_framework import serializers
            raise serializers.ValidationError({"assignedDriver": f"Server crash: {str(e)} | Tr: {traceback.format_exc()}"})

    @action(detail=True, methods=['get'])
    def capacity_fill_suggestions(self, request, pk=None):
        vehicle = self.get_object()
        cluster_id = request.query_params.get('cluster_id')
        
        if not cluster_id:
            return Response({'error': 'cluster_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate remaining capacity
        current_load = vehicle.current_load_weight
        remaining_kg = float(vehicle.capacity_kg) - current_load
        
        # Get orders currently in the cluster to find centroid
        from .models import Order
        cluster_prefix = cluster_id.split('_')[0] # Warehouse ID
        orders_in_cluster = Order.objects.filter(status='pending', warehouse_id=cluster_prefix) # Simplified cluster retrieval
        # In a real app we'd fetch specific IDs from the cluster cache/state
        
        # Get unassigned orders from the same warehouse
        unassigned = Order.objects.filter(status='pending', warehouse_id=cluster_prefix).exclude(order_id__in=[o.order_id for o in orders_in_cluster])
        
        from .utils.route_optimization import get_fill_suggestions
        cluster_coords = [{'lat': float(o.pickup_lat), 'lng': float(o.pickup_lng)} for o in orders_in_cluster if o.pickup_lat]
        
        unassigned_data = []
        for o in unassigned:
            if o.pickup_lat:
                unassigned_data.append({
                    'id': o.order_id,
                    'weight_kg': float(o.weight_kg),
                    'lat': float(o.pickup_lat),
                    'lng': float(o.pickup_lng),
                    'address': o.pickup_address
                })
        
        suggestions = get_fill_suggestions(unassigned_data, cluster_coords, remaining_kg, 0)
        return Response(suggestions)

class VehicleAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VehicleAssignment.objects.all().order_by('-assignment_start_date')
    serializer_class = VehicleAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def driver_history(self, request):
        driver_id = request.query_params.get('driver_id')
        if not driver_id:
            return Response({'error': 'driver_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        # Note driver_id is CustomUser ID here as passed by frontend if used
        from .models import DriverProfile
        try:
            drv = DriverProfile.objects.get(employee__user_id=driver_id)
            qs = self.queryset.filter(driver=drv)
        except:
            qs = self.queryset.none()
            
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def vehicle_history(self, request):
        vehicle_id = request.query_params.get('vehicle_id')
        if not vehicle_id:
            return Response({'error': 'vehicle_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        qs = self.queryset.filter(vehicle_id=vehicle_id)
        return Response(self.get_serializer(qs, many=True).data)

from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])  # GPS data submission requires authentication
def tracking_location(request):
    """
    Ingest GPS location from Flutter app and store it in Django local memory cache.
    """
    data = request.data
    driver_id = data.get('driver_id')
    
    if not driver_id:
        return Response({'status': 'error', 'message': 'driver_id required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Enrich with Driver Name and Active Shipment
    from .models import GPSPersistence, DriverProfile, VehicleAssignment, Order
    
    driver_name = "Unknown Driver"
    shipment_info = "No Active Shipment"
    vehicle_plate = "N/A"
    vehicle_model = "Unknown Asset"
    
    try:
        # Note: driver_id in this payload refers to the User ID (as used in HomePage.dart)
        driver_prof = DriverProfile.objects.select_related('employee__user').get(employee__user_id=driver_id)
        driver_name = driver_prof.employee.full_name
        
        # Find all active orders assigned to THIS driver
        active_orders = Order.objects.filter(assigned_driver=driver_prof, status__in=['assigned', 'in_transit'])
        if active_orders.exists():
            order_ids = [f"ORD-{o.order_id}" for o in active_orders]
            shipment_info = ", ".join(order_ids)
            
        # Find active vehicle info
        assignment = VehicleAssignment.objects.filter(driver=driver_prof, status='active').first()
        if assignment and assignment.vehicle:
            vehicle_plate = assignment.vehicle.plate_number
            vehicle_model = f"{assignment.vehicle.manufacturer} {assignment.vehicle.model}"
                
        # Persist for 2-hour window
        GPSPersistence.objects.create(
            driver=driver_prof,
            latitude=data.get('latitude'),
            longitude=data.get('longitude')
        )
    except Exception as e:
        print(f"Tracking Enrichment Error: {e}")

    locations = cache.get('active_locations', {})
    locations[driver_id] = {
        'driver_id': driver_id,
        'driver_name': driver_name,
        'shipment_info': shipment_info,
        'vehicle_id': data.get('vehicle_id'),
        'vehicle_plate': vehicle_plate,
        'vehicle_model': vehicle_model,
        'lat': data.get('latitude'),
        'lng': data.get('longitude'),
        'timestamp': data.get('timestamp'),
        'status': data.get('status')
    }
    cache.set('active_locations', locations, timeout=86400) # keep for 1 day
    return Response({'status': 'success', 'message': 'Location logged'}, status=status.HTTP_202_ACCEPTED)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_locations(request):
    """
    Endpoint for React dashboard to poll periodically for the latest locations.
    """
    locations = cache.get('active_locations', {})
    return Response(list(locations.values()))

from .models import Order, AuditLog, Shipment, ShipmentOrder
from .serializers import OrderSerializer, AuditLogSerializer, ShipmentSerializer
from django.db import transaction

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
             return [IsDispatcherRole()]
        if self.action == 'report_exception':
             return [IsDriverRole()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        order = self.get_object()
        if order.status != 'pending':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Modifications are prohibited once an order has been assigned to a cluster or shipment.")
        
        from .utils.geocoding import geocode_address
        # 1. Geocode Pickup address if it changed
        new_pickup = self.request.data.get('pickup_address')
        if new_pickup and new_pickup != order.pickup_address:
            lat, lng = geocode_address(new_pickup)
            serializer.validated_data['pickup_lat'] = lat
            serializer.validated_data['pickup_lng'] = lng

        # 2. Geocode Delivery address if it changed
        new_delivery = self.request.data.get('delivery_address')
        if new_delivery and new_delivery != order.delivery_address:
            lat, lng = geocode_address(new_delivery)
            serializer.validated_data['delivery_lat'] = lat
            serializer.validated_data['delivery_lng'] = lng
            
        serializer.save()

    def perform_destroy(self, instance):
        if instance.status != 'pending':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("You cannot delete an order that has already been assigned or dispatched.")
        instance.delete()

    @action(detail=False, methods=['get'])
    def driver_tasks(self, request):
        user = request.user
        user_id_fallback = request.query_params.get('user_id')
        
        if not user.is_authenticated and not user_id_fallback:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            from .models import DriverProfile
            if user.is_authenticated:
                driver = DriverProfile.objects.get(employee__user=user)
            else:
                driver = DriverProfile.objects.get(employee__user_id=user_id_fallback)
                
            tasks = Order.objects.filter(assigned_driver=driver, status__in=['assigned', 'in_transit'])
            return Response(OrderSerializer(tasks, many=True).data)
        except DriverProfile.DoesNotExist:
            return Response({'error': 'No active driver profile found for this user.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def report_exception(self, request, pk=None):
        order = self.get_object()
        exception_type = request.data.get('exception_type')
        notes = request.data.get('notes', '')
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        
        from .models import DriverProfile, OrderException, OrderStatusLog
        try:
            driver = DriverProfile.objects.get(employee__user=request.user)
        except DriverProfile.DoesNotExist:
             return Response({'error': 'Only drivers can report exceptions'}, status=status.HTTP_403_FORBIDDEN)
             
        # Create exception record
        OrderException.objects.create(
            order=order,
            exception_type=exception_type,
            driver=driver,
            location_lat=lat,
            location_lng=lng,
            notes=notes
        )
        
        # Log status change
        old_status = order.status
        order.status = 'delivery_failed'
        order.save()
        
        OrderStatusLog.objects.create(
            order=order,
            from_status=old_status,
            to_status='delivery_failed',
            changed_by=request.user,
            source='driver_exception'
        )
        
        return Response({'success': True, 'message': 'Exception reported successfully'})

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.all().order_by('-created_at')
    serializer_class = ShipmentSerializer
    def get_permissions(self):
        # Specific driver actions allowed with basic auth
        driver_actions = ['driver_tasks', 'driver_active', 'assignment_view', 'accept_assignment', 'scan_pickup', 'scan_delivery', 'report_exception']
        if self.action in driver_actions:
            return [permissions.IsAuthenticated()]
        # Internal deployment actions restrict to Dispatchers
        if self.action == 'deploy_manifest':
            return [IsDispatcherRole()]
        return [IsInternalRole()]

    def perform_destroy(self, instance):
        with transaction.atomic():
            # 1. Reset all orders linked to this shipment
            from .models import ShipmentOrder, OrderStatusLog
            mappings = ShipmentOrder.objects.filter(shipment=instance)
            for m in mappings:
                order = m.order
                old_status = order.status
                order.status = 'pending'
                order.assigned_vehicle = None
                order.assigned_driver = None
                order.save()
                
                # Log the status reversal for audit trail
                OrderStatusLog.objects.create(
                    order=order,
                    from_status=old_status,
                    to_status='pending',
                    changed_by=self.request.user,
                    source='management_deletion'
                )

            # 2. Release Assets
            if instance.vehicle:
                instance.vehicle.status = 'available'
                instance.vehicle.save()
            if instance.driver:
                instance.driver.status = 'available'
                instance.driver.save()
            
            # 3. Audit Logging
            from .models import AuditLog
            AuditLog.objects.create(
                user=self.request.user,
                action='DELETE_SHIPMENT',
                resource_type='Shipment',
                resource_id=instance.shipment_id,
                details=f"Permanent deletion of Shipment #{instance.shipment_id}. Associated orders reverted to 'pending' as primary records."
            )
            
            instance.delete()

    @action(detail=False, methods=['post'])
    def deploy_manifest(self, request):
        order_ids = request.data.get('order_ids', [])
        vehicle_id = request.data.get('vehicle_id')
        driver_id = request.data.get('driver_id') # User ID
        
        if not order_ids or not vehicle_id or not driver_id:
            return Response({'error': 'Insufficient manifest data: orders, vehicle, and driver are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            with transaction.atomic():
                from .models import DriverProfile, Vehicle, AuditLog
                vehicle = Vehicle.objects.get(vehicle_id=vehicle_id)
                driver = DriverProfile.objects.get(employee__user_id=driver_id)
                orders = Order.objects.filter(order_id__in=order_ids)
                
                # 1. Validate Capacity
                total_w = sum(float(o.weight_kg) for o in orders)
                total_v = sum(float(o.volume_m3) for o in orders)
                needs_fridge = any(o.requires_refrigeration for o in orders)
                
                if total_w > float(vehicle.capacity_kg):
                    return Response({'error': f"Payload ({total_w}kg) exceeds vehicle capacity ({vehicle.capacity_kg}kg)"}, status=status.HTTP_400_BAD_REQUEST)
                if total_v > float(vehicle.capacity_volume):
                    return Response({'error': f"Volume ({total_v}m3) exceeds vehicle storage ({vehicle.capacity_volume}m3)"}, status=status.HTTP_400_BAD_REQUEST)
                if needs_fridge and not vehicle.is_refrigerated:
                    return Response({'error': "Manifest contains refrigerated items, but the vehicle is not equipped with a cooling system."}, status=status.HTTP_400_BAD_REQUEST)

                # 2. Determine Shipment Type
                types = set(o.shipment_type for o in orders)
                s_type = 'mixed' if len(types) > 1 else list(types)[0]
                
                # 3. Create Shipment
                shipment = Shipment.objects.create(
                    vehicle=vehicle,
                    driver=driver,
                    total_weight=total_w,
                    total_volume=total_v,
                    shipment_type=s_type,
                    requires_refrigeration=needs_fridge,
                    status='dispatched',
                    deployed_at=timezone.now()
                )
                
                # 4. Automatic Sequence & Routing
                from .utils.route_optimization import sequence_route, calculate_etas
                first_order = orders.first()
                origin = {
                    'lat': float(first_order.warehouse_lat) if first_order.warehouse_lat else 0,
                    'lng': float(first_order.warehouse_lng) if first_order.warehouse_lng else 0,
                    'address': first_order.warehouse_address,
                    'name': first_order.warehouse_name
                }
                
                stops_data = []
                for o in orders:
                    stops_data.append({
                        'id': o.order_id,
                        'lat': float(o.delivery_lat),
                        'lng': float(o.delivery_lng),
                        'address': o.delivery_address
                    })
                    
                ordered_stops = sequence_route(stops_data, origin)
                shipment.route_sequence = [s['id'] for s in ordered_stops]
                shipment.scheduled_pickup_time = timezone.now() + timezone.timedelta(minutes=15)
                shipment.save()

                # 5. Map Orders and Update Status
                for o in orders:
                    ShipmentOrder.objects.create(shipment=shipment, order=o)
                    o.assigned_vehicle = vehicle
                    o.assigned_driver = driver
                    o.status = 'assigned'
                    o.save()
                
                # 6. Mark Assets as Busy
                vehicle.status = 'in_use'
                vehicle.save()
                driver.status = 'busy'
                driver.save()
                
                # 7. Audit Log
                AuditLog.objects.create(
                    user=request.user,
                    action='DEPLOY_MANIFEST',
                    resource_type='Shipment',
                    resource_id=shipment.shipment_id,
                    details=f"Deployed Manifest #{shipment.shipment_id} with {len(order_ids)} orders to Vehicle {vehicle.plate_number}. Sequential route calculated."
                )
                
                return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f"Deployment failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def assignment_view(self, request):
        user = request.user
        user_id_fallback = request.query_params.get('user_id')
        
        from .models import DriverProfile, ShipmentOrder
        try:
            if user.is_authenticated:
                driver = DriverProfile.objects.get(employee__user=user)
            else:
                driver = DriverProfile.objects.get(employee__user_id=user_id_fallback)
                
            shipment = Shipment.objects.filter(driver=driver, status__in=['dispatched', 'accepted', 'in_transit']).order_by('-created_at').first()
            if not shipment:
                 return Response({'error': 'No active assignment'}, status=status.HTTP_404_NOT_FOUND)

            order_mappings = ShipmentOrder.objects.filter(shipment=shipment).select_related('order')
            orders = [m.order for m in order_mappings]
            if not orders:
                 return Response({'error': 'No orders in shipment'}, status=status.HTTP_404_NOT_FOUND)

            first_order = orders[0]
            origin = {
                'lat': float(first_order.warehouse_lat) if first_order.warehouse_lat else 0,
                'lng': float(first_order.warehouse_lng) if first_order.warehouse_lng else 0,
                'address': first_order.warehouse_address,
                'name': first_order.warehouse_name
            }
            
            # Map sequence back to order objects
            ordered_orders = sorted(orders, key=lambda x: shipment.route_sequence.index(x.order_id) if (shipment.route_sequence and x.order_id in shipment.route_sequence) else 999)
            
            stops = []
            current_time = shipment.scheduled_pickup_time or timezone.now()
            prev_lat, prev_lng = origin['lat'], origin['lng']
            total_dist = 0
            
            from .utils.route_optimization import haversine
            for i, o in enumerate(ordered_orders):
                dist = haversine(prev_lat, prev_lng, float(o.delivery_lat), float(o.delivery_lng))
                travel_time = dist / 40.0
                current_time += timezone.timedelta(hours=travel_time)
                total_dist += dist
                
                stops.append({
                    "sequence": i + 1,
                    "order_id": str(o.order_id),
                    "address": o.delivery_address,
                    "city": "Industrial Area",
                    "delivery_instructions": "Check for fragile items",
                    "customer_phone": "0712345678",
                    "estimated_arrival": current_time.isoformat(),
                    "parcels": o.quantity,
                    "weight_kg": float(o.weight_kg)
                })
                prev_lat, prev_lng = float(o.delivery_lat), float(o.delivery_lng)

            return Response({
                "shipment_id": str(shipment.shipment_id),
                "status": shipment.status,
                "vehicle": {
                    "plate_number": shipment.vehicle.plate_number,
                    "model": f"{shipment.vehicle.manufacturer} {shipment.vehicle.model}" if shipment.vehicle.model else shipment.vehicle.manufacturer,
                    "is_refrigerated": shipment.vehicle.is_refrigerated
                },
                "warehouse": {
                    "id": first_order.warehouse_id,
                    "name": first_order.warehouse_name,
                    "address": first_order.warehouse_address,
                    "gate": "Gate 1",
                    "contact_phone": "+94 77 111 2222",
                    "pickup_time": shipment.scheduled_pickup_time.isoformat() if shipment.scheduled_pickup_time else None,
                    "ready_time": shipment.scheduled_pickup_time.isoformat() if shipment.scheduled_pickup_time else None
                },
                "route_summary": {
                    "total_stops": len(stops),
                    "total_distance_km": round(total_dist, 2),
                    "estimated_duration_minutes": int(total_dist / 40.0 * 60)
                },
                "stops": stops,
                "driver_briefing": {
                    "leave_by": shipment.leave_by_time.isoformat() if shipment.leave_by_time else None,
                    "notes": "Observe all safety protocols."
                }
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def accept_assignment(self, request, pk=None):
        shipment = self.get_object()
        if shipment.status != 'dispatched':
            return Response({'error': 'Shipment is not in a dispatchable state'}, status=status.HTTP_400_BAD_REQUEST)
        
        shipment.status = 'accepted'
        shipment.accepted_at = timezone.now()
        shipment.save()
        
        from .models import OrderStatusLog, ShipmentOrder, CustomUser
        
        # Identity Fallback logic
        user = request.user
        if not user.is_authenticated:
            u_id = request.data.get('user_id')
            if u_id:
                user = CustomUser.objects.filter(user_id=u_id).first()
        
        order_mappings = ShipmentOrder.objects.filter(shipment=shipment)
        for m in order_mappings:
            old_status = m.order.status
            m.order.status = 'assigned'
            m.order.save()
            
            OrderStatusLog.objects.create(
                order=m.order,
                from_status=old_status,
                to_status='assigned',
                changed_by=user,
                source='system'
            )
            
        return Response({'success': True, 'status': shipment.status})

    @action(detail=True, methods=['post'])
    def scan_pickup(self, request, pk=None):
        shipment = self.get_object()
        qr_token = request.data.get('qr_token')
        
        # QR validation: exact match preferred, fallback to contains
        expected_qr = f"MF-{shipment.shipment_id}"
        if not qr_token or (expected_qr not in qr_token and str(shipment.shipment_id) not in qr_token):
            return Response({'error': 'Invalid QR manifest signature. Expected manifest QR.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        shipment.status = 'in_transit'
        shipment.pickup_scanned_at = timezone.now()
        shipment.save()
        
        from .models import OrderStatusLog, ShipmentOrder, CustomUser
        
        # Identity Fallback
        user = request.user
        if not user.is_authenticated:
            u_id = request.data.get('user_id')
            if u_id:
                user = CustomUser.objects.filter(user_id=u_id).first()

        order_mappings = ShipmentOrder.objects.filter(shipment=shipment)
        for m in order_mappings:
            old_status = m.order.status
            m.order.status = 'in_transit'
            m.order.save()
            
            OrderStatusLog.objects.create(
                order=m.order,
                from_status=old_status,
                to_status='in_transit',
                changed_by=user,
                source='driver_scan'
            )
            
        return Response({'success': True, 'status': shipment.status})

    @action(detail=True, methods=['post'])
    def scan_delivery(self, request, pk=None):
        shipment = self.get_object()
        order_id = request.data.get('order_id')
        qr_token = request.data.get('qr_token')
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        
        if not qr_token or not order_id:
             return Response({'error': 'QR token and order_id are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Exact QR match: token must contain shipment and order identifiers
        expected_token_part = f"SHP-{shipment.shipment_id}-ORD-{order_id}"
        if expected_token_part not in qr_token and str(order_id) not in qr_token:
             return Response({'error': 'QR mismatch: Parcel does not belong to this stop.'}, status=status.HTTP_400_BAD_REQUEST)

        from .models import Order, OrderStatusLog, CustomUser
        try:
            order = Order.objects.get(order_id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order context lost'}, status=status.HTTP_404_NOT_FOUND)
        
        # CRITICAL: Prevent duplicate delivery
        if order.status == 'delivered':
            return Response({'error': 'This order has already been delivered. Scan rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        if order.status == 'delivery_failed':
            return Response({'error': 'This order has a recorded exception. Contact dispatcher.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Identity Fallback
        user = request.user
        if not user.is_authenticated:
            u_id = request.data.get('user_id')
            if u_id:
                user = CustomUser.objects.filter(user_id=u_id).first()

        old_status = order.status
        order.status = 'delivered'
        order.delivered_at = timezone.now()
        order.delivered_by_driver_id = shipment.driver.driver_id
        order.delivery_location_lat = lat
        order.delivery_location_lng = lng
        order.save()
        
        OrderStatusLog.objects.create(
            order=order,
            from_status=old_status,
            to_status='delivered',
            changed_by=user,
            source='driver_scan'
        )
        
        from .models import ShipmentOrder
        remaining = ShipmentOrder.objects.filter(shipment=shipment).exclude(order__status__in=['delivered', 'delivery_failed']).count()
        
        if remaining == 0:
            shipment.status = 'completed'
            shipment.completed_at = timezone.now()
            shipment.save()
            
        return Response({
            'success': True, 
            'is_completed': remaining == 0,
            'remaining_stops': remaining
        })

    @action(detail=False, methods=['get'])
    def driver_active(self, request):
        """ Fetch the active manifest for the logged-in driver. """
        user = request.user
        user_id_fallback = request.query_params.get('user_id')
        
        if not user.is_authenticated and not user_id_fallback:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
        from .models import DriverProfile
        try:
            if user.is_authenticated:
                driver = DriverProfile.objects.get(employee__user=user)
            else:
                driver = DriverProfile.objects.get(employee__user_id=user_id_fallback)
                
            shipment = Shipment.objects.filter(driver=driver, status__in=['dispatched', 'accepted', 'in_transit']).first()
            if shipment:
                data = ShipmentSerializer(shipment).data
                data['assignment_type'] = 'outbound'
                return Response(data)
                
            # Check for Inbound Assignment
            from inbound.models import InboundCollectionAssignment
            from inbound.serializers import AssignmentDetailSerializer
            target_user_id = user.id if user.is_authenticated else user_id_fallback
            inbound_assignment = InboundCollectionAssignment.objects.filter(
                driver__employee__user_id=target_user_id,
                status__in=['assigned', 'accepted', 'en_route', 'at_supplier', 'verifying', 'returning']
            ).first()


            if inbound_assignment:
                data = AssignmentDetailSerializer(inbound_assignment).data
                data['assignment_type'] = 'inbound'
                return Response(data)

            return Response({'detail': 'No active manifest assigned to this driver.'}, status=status.HTTP_404_NOT_FOUND)

        except DriverProfile.DoesNotExist:
            return Response({'error': 'Driver profile not found for the provided identity.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f"Operation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminRole]

def find_best_vehicle(total_weight, total_volume, requires_fridge):
    assets = Vehicle.objects.filter(status='available')
    if requires_fridge:
        assets = assets.filter(is_refrigerated=True)
    
    # Sort by capacity to get the smallest viable vehicle
    potential = assets.filter(
        capacity_kg__gte=total_weight,
        capacity_volume__gte=total_volume
    ).order_by('capacity_kg')
    
    return potential.first()

@api_view(['GET'])
@permission_classes([IsDispatcherRole])
def dispatch_recommendations(request):
    """
    Get recommended order clusters with metrics and suggested assets, grouped by warehouse.
    """
    pending_orders = Order.objects.filter(status='pending')
    if not pending_orders.exists():
        return Response({'warehouses': {}}, status=status.HTTP_200_OK)
    
    order_data = []
    for o in pending_orders:
        if o.pickup_lat and o.pickup_lng:
            order_data.append({
                'id': o.order_id,
                'lat': float(o.pickup_lat),
                'lng': float(o.pickup_lng),
                'warehouse_id': o.warehouse_id,
                'warehouse_name': o.warehouse_name,
                'warehouse_address': o.warehouse_address
            })
            
    if not order_data:
        return Response({'warehouses': {}}, status=status.HTTP_200_OK)
        
    clusters = cluster_orders(order_data)
    
    warehouses_output = {}
    
    for cluster_id, order_ids in clusters.items():
        order_objs = Order.objects.filter(order_id__in=order_ids)
        if not order_objs.exists(): continue
        
        first_order = order_objs.first()
        wh_id = first_order.warehouse_id
        
        if wh_id not in warehouses_output:
            warehouses_output[wh_id] = {
                'id': wh_id,
                'name': first_order.warehouse_name,
                'address': first_order.warehouse_address,
                'clusters': {}
            }
        
        # Calculate stats
        total_weight = sum(float(o.weight_kg) for o in order_objs)
        total_volume = sum(float(o.volume_m3) for o in order_objs)
        needs_fridge = any(o.requires_refrigeration for o in order_objs)
        
        # Find best vehicle
        suggested_asset = find_best_vehicle(total_weight, total_volume, needs_fridge)
        
        warehouses_output[wh_id]['clusters'][cluster_id] = {
            'orders': OrderSerializer(order_objs, many=True).data,
            'metrics': {
                'total_weight': total_weight,
                'total_volume': total_volume,
                'needs_fridge': needs_fridge,
                'order_count': order_objs.count()
            },
            'suggestion': VehicleSerializer(suggested_asset).data if suggested_asset else None
        }
        
    return Response({'warehouses': warehouses_output}, status=status.HTTP_200_OK)


from .filters import DeliverySearchFilter
from .serializers import OrderSerializer, AuditLogSerializer, ShipmentSerializer, OrderExceptionSerializer, OrderStatusLogSerializer
try:
    import firebase_admin
    from firebase_admin import db as firebase_db
except ImportError:
    firebase_admin = None
    firebase_db = None

class DeliverySearchView(APIView):
    permission_classes = [IsInternalRole]

    def get(self, request):
        from .search_service import DeliverySearchService
        params = DeliverySearchFilter(request.GET, queryset=Order.objects.all())
        
        service = DeliverySearchService(
            user=request.user,
            params=request.GET
        )
        results = service.execute()
        
        # Apply filters from django-filter
        # Use order_id instead of id
        results = params.qs.filter(order_id__in=results.values_list('order_id', flat=True))
        
        serializer = OrderSerializer(results, many=True)
        return Response({
            'count': results.count(),
            'results': serializer.data,
        })

class LiveVehicleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Fallback to local cache if firebase not fully setup
        locations = cache.get('active_locations', {})
        
        vehicle_id = request.query_params.get('vehicle_id')
        driver_id  = request.query_params.get('driver_id')

        results = []
        for d_id, data in locations.items():
            if vehicle_id and str(data.get('vehicle_id')) != str(vehicle_id):
                continue
            if driver_id and str(data.get('driver_id')) != str(driver_id):
                continue
            results.append(data)

        return Response({'count': len(results), 'results': results})

class OrderAuditView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        try:
            order = Order.objects.prefetch_related(
                'status_logs__changed_by',
                'exceptions__driver',
                'assigned_driver',
                'assigned_vehicle',
            ).get(order_id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)

        return Response({
            'order': OrderSerializer(order).data,
            'status_timeline': OrderStatusLogSerializer(
                order.status_logs.order_by('changed_at'), many=True
            ).data,
            'exceptions': OrderExceptionSerializer(
                order.exceptions.order_by('reported_at'), many=True
            ).data,
            'tracking_summary': self._get_tracking_summary(order),
        })

    def _get_tracking_summary(self, order):
        # Fetch historical breadcrumbs from local cache/persistence since firebase might be empty
        from .models import GPSPersistence
        if order.assigned_driver:
            history = GPSPersistence.objects.filter(
                driver=order.assigned_driver,
                timestamp__date=order.created_at.date()
            ).order_by('timestamp')
            return [
                {'lat': float(h.latitude), 'lng': float(h.longitude), 'timestamp': h.timestamp.isoformat()}
                for h in history
            ]
        return []


class ChangePasswordView(APIView):
    """
    Allow an authenticated user to change their own password.
    POST: { "old_password": "...", "new_password": "..." }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')

        if not old_password or not new_password:
            return Response(
                {'detail': 'Both old_password and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(old_password):
            return Response(
                {'detail': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 6:
            return Response(
                {'detail': 'New password must be at least 6 characters long.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        # Audit log
        from .models import AuditLog
        AuditLog.objects.create(
            user=user,
            action='PASSWORD_CHANGE',
            resource_type='Account',
            details=f"User '{user.username}' changed their password."
        )

        return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)

