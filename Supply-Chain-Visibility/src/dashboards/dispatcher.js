import React, { useState, useEffect } from "react";
import { MapContainer as LeafletMap, TileLayer as LeafletTile, Marker as LeafletMarker, Popup as LeafletPopup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';
import L from 'leaflet';
import { 
    MdLocalShipping, MdMap, MdNotificationsActive, 
    MdAssignment, MdTimer, MdRadioButtonChecked, MdExpandMore
} from "react-icons/md";
import { 
    Navigation, List, Activity, Users,
    Shield, Clock, AlertCircle, CheckCircle2 
} from "lucide-react";
import toast from "react-hot-toast";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const vehicleIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448327.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

export default function DispatcherDashboard() {
    const [vehicles, setVehicles] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [failedOrders, setFailedOrders] = useState([]);
    const [selectedFailedOrder, setSelectedFailedOrder] = useState(null);
    const [selectedShipmentForReassign, setSelectedShipmentForReassign] = useState('');
    const [stats, setStats] = useState({ active: 0, pending: 0, delayed: 0 });
    const [loading, setLoading] = useState(true);

    const fetchDispatcherData = async () => {
        try {
            const [trackingRes, shipmentsRes, ordersRes] = await Promise.all([
                api.get('tracking/locations/'),
                api.get('shipments/'),
                api.get('orders/')
            ]);
            
            setVehicles(trackingRes.data);
            setShipments(shipmentsRes.data.slice(0, 10));
            
            const failed = ordersRes.data.filter(o => o.status === 'delivery_failed');
            setFailedOrders(failed);
            
            // Calculate simple stats
            const activeCount = shipmentsRes.data.filter(s => s.status === 'in_transit').length;
            const pendingCount = shipmentsRes.data.filter(s => s.status === 'pending' || s.status === 'assigned').length;
            setStats({ active: activeCount, pending: pendingCount, delayed: failed.length });
            
        } catch (err) {
            console.error("Dispatcher sync error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDispatcherData();
        const interval = setInterval(fetchDispatcherData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleMethodA = async () => {
        if (!selectedFailedOrder || !selectedShipmentForReassign) return;
        try {
            toast.loading("Reassigning to shipment...");
            await api.post(`orders/${selectedFailedOrder.order_id}/reassign_to_shipment/`, {
                shipment_id: selectedShipmentForReassign
            });
            toast.dismiss();
            toast.success("Order reassigned successfully.");
            setSelectedFailedOrder(null);
            fetchDispatcherData();
        } catch (err) {
            toast.dismiss();
            toast.error(err.response?.data?.error || "Failed to reassign order.");
        }
    };

    const handleMethodB = async () => {
        if (!selectedFailedOrder) return;
        try {
            toast.loading("Marking as priority...");
            await api.post(`orders/${selectedFailedOrder.order_id}/mark_priority/`);
            toast.dismiss();
            toast.success("Order returned to priority queue.");
            setSelectedFailedOrder(null);
            fetchDispatcherData();
        } catch (err) {
            toast.dismiss();
            toast.error(err.response?.data?.error || "Failed to update order.");
        }
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-6 animate-fade-in">
            
            {/* Top Stat Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <ControlStat 
                    label="Active Missions" 
                    value={stats.active} 
                    icon={Activity} 
                    color="emerald" 
                />
                <ControlStat 
                    label="Assigned Pending" 
                    value={stats.pending} 
                    icon={Clock} 
                    color="blue" 
                />
                <ControlStat 
                    label="Critical Alerts" 
                    value={stats.delayed} 
                    icon={AlertCircle} 
                    color="rose" 
                />
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                
                {/* Live Situational Map */}
                <div className="flex-[2] bg-coffee-950 rounded-[40px] border border-coffee-900 shadow-2xl shadow-coffee-950/40 relative overflow-hidden group">
                    <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-3">
                        <div className="bg-coffee-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Grid Active: {vehicles.length} Units</span>
                        </div>
                    </div>

                    <LeafletMap 
                        center={[6.9271, 79.8612]} 
                        zoom={13} 
                        style={{ height: "100%", width: "100%" }}
                        zoomControl={false}
                    >
                        <LeafletTile
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                        {vehicles.map((v) => (
                            <LeafletMarker 
                                key={v.driver_id} 
                                position={[v.lat || 0, v.lng || 0]}
                                icon={vehicleIcon}
                            >
                                <LeafletPopup className="custom-popup">
                                    <div className="p-2">
                                        <p className="text-[10px] font-black uppercase text-coffee-400 mb-1">Unit Tracking</p>
                                        <p className="text-sm font-black text-coffee-900 mb-2">Driver ID: {v.driver_id}</p>
                                        <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                            <Navigation size={10} />
                                            <span className="text-[9px] font-black uppercase tracking-tighter">Status: {v.status}</span>
                                        </div>
                                    </div>
                                </LeafletPopup>
                            </LeafletMarker>
                        ))}
                    </LeafletMap>
                </div>

                {/* Mission Status Sidebar */}
                <div className="flex-1 bg-white rounded-[40px] border border-coffee-100 shadow-sm flex flex-col min-w-[350px]">
                    <div className="p-8 border-b border-coffee-50">
                        <h3 className="text-lg font-black text-coffee-950 flex items-center gap-3">
                            <List className="text-coffee-400" size={20} />
                            Dispatch Hub
                        </h3>
                        <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest mt-1">Recent Mission Manifests</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {failedOrders.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <AlertCircle size={14} /> Action Required: Failed Deliveries
                                </h4>
                                <div className="space-y-3">
                                    {failedOrders.map(o => (
                                        <div key={o.order_id} onClick={() => setSelectedFailedOrder(o)} className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer group">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black text-rose-500 font-mono">ORD-{o.order_id}</span>
                                                <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md bg-rose-500 text-white">
                                                    Failed
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-black text-rose-900 line-clamp-1">{o.delivery_address}</h4>
                                            <p className="text-[10px] text-rose-600 font-medium mt-1">Requires immediate reassignment.</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <h4 className="text-xs font-black text-coffee-400 uppercase tracking-widest mb-3">Active Manifests</h4>
                        {shipments.map((s) => (
                            <div key={s.shipment_id} className="p-5 bg-coffee-50/30 rounded-3xl border border-coffee-50 hover:border-coffee-200 hover:bg-white transition-all cursor-pointer group">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-black text-coffee-300 font-mono">#{s.shipment_id.toString().padStart(4, '0')}</span>
                                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md ${
                                        s.status === 'in_transit' ? 'bg-indigo-500 text-white' : 
                                        s.status === 'completed' ? 'bg-emerald-500 text-white' : 
                                        'bg-coffee-200 text-coffee-600'
                                    }`}>
                                        {s.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <h4 className="text-sm font-black text-coffee-900 group-hover:text-coffee-600 transition-colors">Manifest #{s.shipment_id}</h4>
                                <div className="mt-4 flex items-center justify-between text-coffee-400">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-coffee-100 flex items-center justify-center">
                                            <Users size={12} className="text-coffee-500" />
                                        </div>
                                        <span className="text-[10px] font-bold">Driver ID: {s.driver}</span>
                                    </div>
                                    <MdExpandMore size={18} className="text-coffee-200 group-hover:text-coffee-400 transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-coffee-50/50 border-t border-coffee-50 rounded-b-[40px]">
                        <button className="w-full py-4 bg-coffee-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-coffee-900 transition-all active:scale-95 shadow-xl shadow-coffee-950/20">
                            Create New Manifest
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Resolution Modal */}
            {selectedFailedOrder && (
                <div className="fixed inset-0 bg-coffee-950/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl p-8 max-w-md w-full border border-coffee-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-coffee-950">Resolve Delivery Failure</h3>
                                <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">ORD-{selectedFailedOrder.order_id}</p>
                            </div>
                        </div>
                        
                        <div className="mb-6 p-4 bg-coffee-50 rounded-2xl">
                            <p className="text-xs font-medium text-coffee-600">{selectedFailedOrder.delivery_address}</p>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Method A */}
                            <div className="p-4 border border-coffee-100 rounded-2xl">
                                <p className="text-xs font-black text-coffee-900 mb-2">Method A: Immediate Reassignment</p>
                                <p className="text-[10px] text-coffee-500 mb-3">Attach to an ongoing, un-departed shipment.</p>
                                <select 
                                    className="w-full bg-coffee-50 border border-coffee-100 rounded-xl px-3 py-2 text-xs font-medium text-coffee-900 focus:ring-2 focus:ring-indigo-500/20 outline-none mb-3"
                                    value={selectedShipmentForReassign}
                                    onChange={(e) => setSelectedShipmentForReassign(e.target.value)}
                                >
                                    <option value="">Select an active shipment...</option>
                                    {shipments.filter(s => ['planned', 'assigned', 'accepted'].includes(s.status)).map(s => (
                                        <option key={s.shipment_id} value={s.shipment_id}>Shipment #{s.shipment_id} ({s.status})</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={handleMethodA}
                                    disabled={!selectedShipmentForReassign}
                                    className="w-full py-2.5 bg-indigo-50 text-indigo-600 disabled:opacity-50 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                                >
                                    Assign to Selected Shipment
                                </button>
                            </div>
                            
                            {/* Method B */}
                            <div className="p-4 border border-coffee-100 rounded-2xl">
                                <p className="text-xs font-black text-coffee-900 mb-2">Method B: Priority Planning</p>
                                <p className="text-[10px] text-coffee-500 mb-3">Return to general queue and flag as High Priority.</p>
                                <button 
                                    onClick={handleMethodB}
                                    className="w-full py-2.5 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all"
                                >
                                    Return to Queue (Priority)
                                </button>
                            </div>
                        </div>
                        
                        <div className="mt-6 text-center">
                            <button onClick={() => setSelectedFailedOrder(null)} className="text-xs font-bold text-coffee-400 hover:text-coffee-600 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ControlStat({ label, value, icon: Icon, color }) {
    const colorMap = {
        emerald: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
        blue: "text-blue-600 bg-blue-500/10 border-blue-500/20",
        rose: "text-rose-600 bg-rose-500/10 border-rose-500/20",
    };

    return (
        <div className={`p-6 rounded-[32px] border ${colorMap[color]} flex items-center justify-between bg-white shadow-sm`}>
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-coffee-400 mb-1">{label}</p>
                <p className="text-2xl font-black text-coffee-950">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color].split(' ')[1]}`}>
                <Icon size={24} />
            </div>
        </div>
    );
}
