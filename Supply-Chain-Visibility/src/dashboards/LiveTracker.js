import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api';
import { database } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { BiCar, BiUser, BiRefresh, BiTime, BiBox, BiMapPin, BiNavigation, BiStation } from 'react-icons/bi';

// Fix typical Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function RecenterAutomatically({lat, lng}) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export default function LiveTracker() {
  const initialCenter = [6.9271, 79.8612];
  const initialZoom = 13;
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const fetchLocations = async () => {
    // We still fetch initial baseline data from API for driver names etc
    try {
      const response = await api.get('tracking/locations/');
      const baseline = response.data;
      setVehicles(baseline);
    } catch (error) {
      console.error("Error fetching baseline locations:", error);
    }
  };

  useEffect(() => {
    fetchLocations();
    
    // Listen to real-time updates from Firebase
    const trackingRef = ref(database, 'tracking');
    const unsubscribe = onValue(trackingRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            setVehicles(prevVehicles => {
                const newVehicles = [...prevVehicles];
                Object.entries(data).forEach(([shipmentId, info]) => {
                    const current = info.current;
                    if (!current) return;
                    
                    const idx = newVehicles.findIndex(v => v.driver_id === current.driver_id);
                    if (idx !== -1) {
                        newVehicles[idx] = {
                            ...newVehicles[idx],
                            lat: current.lat,
                            lng: current.lng,
                            timestamp: current.timestamp,
                            status: current.active ? 'Moving' : 'Signal Lost',
                            accuracy: current.accuracy
                        };
                    } else {
                        // New driver spotted
                        newVehicles.push({
                            driver_id: current.driver_id,
                            lat: current.lat,
                            lng: current.lng,
                            timestamp: current.timestamp,
                            status: 'New Signal',
                            vehicle_id: 'Locating...'
                        });
                    }
                });
                return newVehicles;
            });
        }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-8 animate-fade-in pb-20 max-w-[1600px] mx-auto">
      
      {/* Control Surface */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6 shrink-0">
        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-7xl"><BiNavigation/></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">Active Telemetry</h2>
                        <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">Real-time GPS Monitoring</p>
                    </div>
                    <button onClick={fetchLocations} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all">
                        <BiRefresh className="text-2xl" />
                    </button>
                </div>
                
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <div className="relative">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute inset-0"></div>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full relative"></div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Signal Status</p>
                        <p className="text-sm font-bold text-emerald-400">{vehicles.length} Units Online</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Selected Identity Card */}
        <div className="bg-white rounded-[32px] border border-slate-200 p-8 flex-1 shadow-sm flex flex-col min-h-[400px]">
          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
             <BiStation className="text-indigo-600 text-2xl"/> Command Center
          </h3>
          
          {selectedVehicle ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl text-indigo-600 border border-slate-100">
                    <BiUser />
                  </div>
                  <div className="pl-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator Identity</p>
                    <p className="text-lg font-black text-slate-900 leading-tight">{selectedVehicle.driver_name || selectedVehicle.driver_id}</p>
                  </div>
              </div>

              <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <BiBox className="text-slate-400 text-xl group-hover:text-indigo-500 transition-colors" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Outbound</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700 pl-8">{selectedVehicle.shipment_info || 'Idle - No active route'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <BiCar className="text-slate-400 text-xl group-hover:text-indigo-500 transition-colors" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Identifier</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700 pl-8 font-mono">{selectedVehicle.vehicle_id}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <BiTime className="text-slate-400 text-xl group-hover:text-indigo-500 transition-colors" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Telemetry Refresh</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700 pl-8">{new Date(selectedVehicle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                  </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className={`px-6 py-3 rounded-2xl text-center text-xs font-black uppercase tracking-[0.2em] border shadow-sm ${
                    selectedVehicle.status === 'Active' || selectedVehicle.status === 'Moving' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                }`}>
                    {selectedVehicle.status || 'Signal Found'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px]">
               <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm shadow-slate-100">
                 <BiMapPin className="text-4xl text-slate-300" />
               </div>
               <h4 className="text-lg font-bold text-slate-900">Telemetry Node Wait</h4>
               <p className="text-sm text-slate-500 mt-2 font-medium">Intersect an active node on the map to initialize detailed identity tracking.</p>
            </div>
          )}
        </div>
      </div>

      {/* Geospatial Visualization Area */}
      <div className="flex-1 bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden relative min-h-[650px] group shadow-slate-200/50">
        <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: "100%", width: "100%", zIndex: 1 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {vehicles.map((vehicle) => (
            <Marker
              key={vehicle.driver_id}
              position={[vehicle.lat || 0, vehicle.lng || 0]}
              eventHandlers={{
                click: () => {
                  setSelectedVehicle(vehicle);
                },
              }}
            >
              <Popup>
                <div className="p-4 min-w-[220px] bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col gap-3">
                  {/* Driver Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-sm">
                      <BiUser />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Operator</p>
                      <p className="text-sm font-black text-slate-900 truncate max-w-[140px]">{vehicle.driver_name || vehicle.driver_id}</p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100"></div>

                  {/* Vehicle Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                      <BiCar />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vehicle Asset</p>
                      <p className="text-xs font-bold text-slate-700">{vehicle.vehicle_plate || 'Unassigned'}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">{vehicle.vehicle_model || 'Standard Unit'}</p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100"></div>

                  {/* Shipment Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl shadow-sm">
                      <BiBox />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Live Outbound</p>
                      <p className="text-[11px] font-bold text-emerald-600 leading-tight">{vehicle.shipment_info || 'Idle - No Route'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-right">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Live Sync: {new Date(vehicle.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {selectedVehicle && (
             <RecenterAutomatically lat={selectedVehicle.lat} lng={selectedVehicle.lng} />
          )}

        </MapContainer>

        {/* Floating Interface hint */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10 shadow-2xl flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">Geospatial Grid: Colombo Metropolitan</span>
            </div>
        </div>
      </div>

    </div>
  );
}
