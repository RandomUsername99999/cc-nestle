from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import logging

logger = logging.getLogger(__name__)

def geocode_address(address):
    """
    Convert an address string to (latitude, longitude) using Nominatim.
    """
    try:
        # User-agent is required by Nominatim
        geolocator = Nominatim(user_agent="logistics_portal_v1")
        location = geolocator.geocode(address, timeout=10)
        if location:
            return location.latitude, location.longitude
        return None, None
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        logger.error(f"Geocoding error for address '{address}': {e}")
        return None, None
