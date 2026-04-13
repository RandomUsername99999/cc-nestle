from vehicles.models import Vehicle
from inbound.models import SupplierDeliveryManifest, SpecialHandlingType

COOLING_CAPABLE_TYPES    = ['refrigerated', 'reefer']
FREEZER_CAPABLE_TYPES    = ['freezer']
HAZMAT_CAPABLE_TYPES     = ['hazmat_certified']
CAPACITY_BUFFER_FACTOR   = 0.90   # use max 90% of vehicle capacity

def find_eligible_vehicles(manifest: SupplierDeliveryManifest) -> list:
    """
    Returns vehicles that satisfy both capacity and special handling requirements,
    ordered by best-fit (smallest surplus capacity first — avoid sending a large
    truck for a small load, but always respect handling requirements first).
    """
    candidates = Vehicle.objects.filter(
        status='available',
        capacity_kg__gte=manifest.total_weight_kg,
        capacity_m3__gte=manifest.total_volume_m3,
    )

    eligible = []
    for vehicle in candidates:
        cap_ok     = _check_capacity(vehicle, manifest)
        cooling_ok = _check_special_handling(vehicle, manifest)

        if cap_ok and cooling_ok:
            surplus = float(vehicle.capacity_kg) - float(manifest.total_weight_kg)
            eligible.append({
                'vehicle':       vehicle,
                'surplus_kg':    surplus,
                'capacity_ok':   cap_ok,
                'cooling_ok':    cooling_ok,
            })

    # Sort: best-fit first (smallest surplus)
    return sorted(eligible, key=lambda x: x['surplus_kg'])


def _check_capacity(vehicle, manifest) -> bool:
    usable_kg = float(vehicle.capacity_kg) * CAPACITY_BUFFER_FACTOR
    usable_m3 = float(vehicle.capacity_m3) * CAPACITY_BUFFER_FACTOR
    return (
        float(manifest.total_weight_kg) <= usable_kg and
        float(manifest.total_volume_m3) <= usable_m3
    )


def _check_special_handling(vehicle, manifest) -> bool:
    handling = manifest.special_handling

    if handling == SpecialHandlingType.NONE:
        return True

    if handling == SpecialHandlingType.COOLING:
        return vehicle.vehicle_type in COOLING_CAPABLE_TYPES + FREEZER_CAPABLE_TYPES

    if handling == SpecialHandlingType.FROZEN:
        # Check temperature range fits within vehicle's min/max
        if vehicle.vehicle_type not in FREEZER_CAPABLE_TYPES:
            return False
        if manifest.temperature_min_c is not None and getattr(vehicle, 'temp_min_c', None) is not None:
            if vehicle.temp_min_c > float(manifest.temperature_min_c):
                return False
        if manifest.temperature_max_c is not None and getattr(vehicle, 'temp_max_c', None) is not None:
            if vehicle.temp_max_c < float(manifest.temperature_max_c):
                return False
        return True

    if handling == SpecialHandlingType.HAZARDOUS:
        return vehicle.vehicle_type in HAZMAT_CAPABLE_TYPES

    return True   # fragile, dry_storage — any vehicle qualifies


def validate_assignment(vehicle, manifest) -> dict:
    """Used at assignment time to record capability check results."""
    return {
        'capacity_ok': _check_capacity(vehicle, manifest),
        'cooling_ok':  _check_special_handling(vehicle, manifest),
    }
