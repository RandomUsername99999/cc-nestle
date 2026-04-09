import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import CustomCard from '../UIComponents/Card';
import { useState, useEffect } from 'react';
import api from '../api';
import L from 'leaflet';

// Fix typical Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function auditLogs(){
    return <>
        <div className='flex flex-row'>
        <CustomCard title={"Active Deliveries"} value={458} info={"+3.2% this week"} />
        <CustomCard title = "Assigned Drivers" value = {25} info = "+3.1% this week" />
        <CustomCard title={"Predicted Delays"} value={25} info={"+15 min avg"} />
        <CustomCard title = "Unassigned Tasks" value = {3} info = {3} />
        </div>  
        <VehicleMap />
    </>
}

const VehicleMap = () => {
  const initialCenter = [6.9271, 79.8612];
  const initialZoom = 13;
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await api.get('tracking/locations/');
        setVehicles(response.data);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };

    fetchLocations();
    // Poll every 3 seconds
    const interval = setInterval(fetchLocations, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: "400px", width: "100%", marginTop: '20px', borderRadius: '10px' }}>
      <TileLayer
        attribution='&copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {vehicles.map((vehicle) => (
        <Marker
          key={vehicle.driver_id}
          position={[vehicle.lat || 0, vehicle.lng || 0]}
        >
          <Popup>
            <strong>Driver:</strong> {vehicle.driver_id} <br />
            <strong>Vehicle:</strong> {vehicle.vehicle_id} <br />
            <strong>Status:</strong> {vehicle.status} <br />
            <strong>Updated:</strong> {new Date(vehicle.timestamp).toLocaleTimeString()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

