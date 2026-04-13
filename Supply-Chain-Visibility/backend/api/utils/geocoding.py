import logging

logger = logging.getLogger(__name__)

try:
    from geopy.geocoders import Nominatim
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
    HAS_GEOPY = True
except ImportError:
    HAS_GEOPY = False

def geocode_address(address):
    """
    Convert an address string to (latitude, longitude) using Nominatim.
    """
    if not HAS_GEOPY:
        print("Geocoding disabled: geopy not installed.")
        return 0.0, 0.0

    try:
        # User-agent is required by Nominatim
        geolocator = Nominatim(user_agent="logistics_portal_v1")
        location = geolocator.geocode(address, timeout=10)
        if location:
            return location.latitude, location.longitude
        return 0.0, 0.0
    except Exception as e:
        logger.error(f"Geocoding error for address '{address}': {e}")
        return 0.0, 0.0
