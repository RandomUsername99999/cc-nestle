try:
    import numpy as np
    from sklearn.cluster import DBSCAN
    HAS_OPTIMIZATION_LIBS = True
except ImportError:
    HAS_OPTIMIZATION_LIBS = False

from typing import List, Dict
import math

# --- Distance Utilities ---

def haversine(lat1, lon1, lat2, lon2):
    """ Calculate the great-circle distance between two points on the Earth's surface. """
    R = 6371  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    return R * c

# --- 1. Warehouse-aware Clustering ---

def cluster_orders(orders: List[Dict]):
    """
    Cluster orders based on GPS coordinates using DBSCAN, but partitioned by warehouse_id
    AND refrigeration requirements.
    """
    if not orders:
        return {}

    # Partition by warehouse_id AND refrigeration requirement
    partitions = {}
    for o in orders:
        wh_id = o.get('warehouse_id', 'Unknown')
        is_refrig = o.get('requires_refrigeration', False)
        # Create a composite key for partitioning
        pkey = f"{wh_id}_REF_{is_refrig}"
        
        if pkey not in partitions:
            partitions[pkey] = []
        partitions[pkey].append(o)

    if not HAS_OPTIMIZATION_LIBS:
        print("⚠️ Route Optimization libraries (numpy/sklearn) missing. Using basic grouping.")
        # Fallback: Just group by composite key without GPS clustering
        return {pkey: [o['id'] for o in p_orders] for pkey, p_orders in partitions.items()}

    all_clusters = {}
    
    for pkey, p_orders in partitions.items():
        coords = np.array([[o['lat'], o['lng']] for o in p_orders if o['lat'] and o['lng']])
        if len(coords) == 0:
            all_clusters[f"{pkey}_None"] = [o['id'] for o in p_orders]
            continue

        # DBSCAN within the partition
        db = DBSCAN(eps=0.03, min_samples=1, metric='euclidean').fit(np.radians(coords))
        labels = db.labels_

        for i, label in enumerate(labels):
            cid = f"{pkey}_{label}"
            if cid not in all_clusters:
                all_clusters[cid] = []
            all_clusters[cid].append(p_orders[i]['id'])

    return all_clusters

# --- 2. Capacity-fill Algorithm ---

def score_capacity_fill(candidate, cluster_centroid, remaining_kg, remaining_m3):
    """
    score = (0.5 * weight_fit_ratio) + (0.3 * proximity_score) + (0.2 * same_day_bonus)
    """
    # Weight fit (higher ratio means a tighter fit)
    weight_fit = 1 - (remaining_kg - float(candidate['weight_kg'])) / remaining_kg if remaining_kg > 0 else 0
    
    # Proximity (clamped to 100km max for scoring)
    dist = haversine(candidate['lat'], candidate['lng'], cluster_centroid['lat'], cluster_centroid['lng'])
    proximity = max(0, 1 - (dist / 100.0))
    
    # Same day bonus (simplified: check if required_date exists/matches)
    # For now, we'll placeholder this as 0 unless meta info is provided
    same_day = 1 if candidate.get('is_urgent') else 0

    return (0.5 * weight_fit) + (0.3 * proximity) + (0.2 * same_day)

def get_fill_suggestions(unassigned_orders, cluster_coords, remaining_kg, remaining_m3):
    """
    Rank top 3 suggestions to fill vehicle capacity.
    """
    if not unassigned_orders or remaining_kg <= 0:
        return []

    # Filter by capacity
    candidates = [o for o in unassigned_orders if float(o['weight_kg']) <= remaining_kg]
    
    # Calculate centroid
    c_lat = sum(o['lat'] for o in cluster_coords) / len(cluster_coords)
    c_lng = sum(o['lng'] for o in cluster_coords) / len(cluster_coords)
    centroid = {'lat': c_lat, 'lng': c_lng}

    scored = []
    for cand in candidates:
        score = score_capacity_fill(cand, centroid, remaining_kg, remaining_m3)
        scored.append({**cand, 'suggestion_score': score})

    scored.sort(key=lambda x: x['suggestion_score'], reverse=True)
    return scored[:3]

# --- 3. Dynamic Route Sequencing (TSP) ---

def sequence_route(stops: List[Dict], origin: Dict):
    """
    Run Nearest-Neighbour and then 2-opt improvement.
    stops: List of {'id', 'lat', 'lng', 'address', ...}
    origin: {'lat', 'lng', 'address'}
    """
    if not stops:
        return []

    # Include origin at start
    all_points = [origin] + stops
    n = len(all_points)
    
    # Nearest Neighbour
    unvisited = list(range(1, n))
    current_idx = 0
    path = [0]
    
    while unvisited:
        next_idx = min(unvisited, key=lambda x: haversine(
            all_points[current_idx]['lat'], all_points[current_idx]['lng'],
            all_points[x]['lat'], all_points[x]['lng']
        ))
        path.append(next_idx)
        unvisited.remove(next_idx)
        current_idx = next_idx

    # 2-opt optimization
    def get_path_dist(p):
        d = 0
        for i in range(len(p) - 1):
            d += haversine(all_points[p[i]]['lat'], all_points[p[i]]['lng'],
                           all_points[p[i+1]]['lat'], all_points[p[i+1]]['lng'])
        return d

    improved = True
    iterations = 0
    while improved and iterations < 100:
        improved = False
        for i in range(1, len(path) - 2):
            for j in range(i + 1, len(path)):
                if j - i == 1: continue
                new_path = path[:i] + path[i:j][::-1] + path[j:]
                if get_path_dist(new_path) < get_path_dist(path):
                    path = new_path
                    improved = True
        iterations += 1

    # Return ordered list (excluding origin for the stop sequence itself)
    return [all_points[i] for i in path[1:]]

def calculate_etas(ordered_stops, start_time, base_lat, base_lng, speed=40):
    """
    Calculate ETAs based on speed (km/h) and distance.
    """
    from datetime import timedelta
    
    current_time = start_time
    prev_lat, prev_lng = base_lat, base_lng
    results = []
    
    for stop in ordered_stops:
        dist = haversine(prev_lat, prev_lng, stop['lat'], stop['lng'])
        travel_time_hours = dist / speed
        current_time += timedelta(hours=travel_time_hours)
        
        results.append({
            **stop,
            'eta': current_time.isoformat(),
            'dist_from_prev': round(dist, 2)
        })
        
        prev_lat, prev_lng = stop['lat'], stop['lng']
    
    return results
