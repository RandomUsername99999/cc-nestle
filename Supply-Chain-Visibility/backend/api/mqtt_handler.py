try:
    import paho.mqtt.client as mqtt
    HAS_MQTT = True
except ImportError:
    HAS_MQTT = False
import json
import logging
from django.conf import settings
from .models import GPSPersistence, DriverProfile

logger = logging.getLogger(__name__)

def on_connect(client, userdata, flags, rc):
    client.subscribe("tracking/gps/#")
    logger.info(f"Connected to MQTT Broker with result code {rc}")

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode()
        # Expecting: driver_user_id:lat:lng:timestamp (or JSON)
        data = json.loads(payload)
        
        driver_id = data.get('driver_id')
        lat = data.get('lat')
        lng = data.get('lng')
        
        if driver_id and lat and lng:
            # 1. Asynchronously persist to DB for 2-hour window
            try:
                driver = DriverProfile.objects.get(employee__user_id=driver_id)
                GPSPersistence.objects.create(
                    driver=driver,
                    latitude=lat,
                    longitude=lng
                )
            except DriverProfile.DoesNotExist:
                logger.warning(f"MQTT: Driver with user_id {driver_id} not found.")

            # 2. Broadcast to WebSockets (via Django Channels)
            # In a production setup, we'd use channel_layer.group_send
            # from channels.layers import get_channel_layer
            # from asgiref.sync import async_to_sync
            # channel_layer = get_channel_layer()
            # async_to_sync(channel_layer.group_send)("tracking", {"type": "gps_update", "data": data})

    except Exception as e:
        logger.error(f"MQTT on_message error: {e}")

def start_mqtt_listener():
    if not HAS_MQTT:
        logger.warning("⚠️ MQTT library missing. Listener disabled.")
        return

    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        # Use a public test broker or local Mosquitto
        broker_host = getattr(settings, 'MQTT_BROKER_HOST', 'localhost')
        client.connect(broker_host, 1883, 60)
        client.loop_start()
    except Exception as e:
        logger.error(f"Failed to start MQTT listener: {e}")
