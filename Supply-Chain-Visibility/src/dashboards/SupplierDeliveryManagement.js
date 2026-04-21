import React, { useState, useEffect } from 'react';
import { Truck, Package, MapPin, Search, ChevronRight, Filter, ExternalLink, ArrowRight, User, Calendar } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const SupplierDeliveryManagement = () => {
    const [manifests, setManifests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [vehicles, setVehicles] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedManifest, setSelectedManifest] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [dockNumber, setDockNumber] = useState('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        fetchManifests();
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            const response = await api.get('vehicles/');
            // Filter only vehicles that have an assigned driver
            setVehicles(response.data.filter(v => v.assignedDriver) || []);
        } catch (error) {
            console.error("Failed to fetch vehicles:", error);
        }
    };

    const fetchManifests = async () => {
        setLoading(true);
        try {
            // Fetching inbound manifests as they represent movements from supplier to hub
            const response = await api.get('inbound/manifests/');
            setManifests(response.data || []);
        } catch (error) {
            console.error("Failed to fetch manifest data:", error);
            toast.error("Bridge Error: Failed to sync supplier delivery data");
        } finally {
            setLoading(false);
        }
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            'received': 'bg-gray-100 text-gray-700 font-bold',
            'assigned': 'bg-blue-100 text-blue-700 font-bold',
            'in_transit': 'bg-amber-100 text-amber-700 font-bold',
            'collected': 'bg-emerald-100 text-emerald-700 font-bold',
            'delivered': 'bg-indigo-100 text-indigo-700 font-bold',
            'discrepancy': 'bg-rose-100 text-rose-700 font-bold',
        };
        return (
            <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider ${styles[status] || styles['received']}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    const filteredManifests = manifests.filter(m => 
        m.manifest_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 bg-[#F8F9FA] min-h-screen font-inter">
            <header className="mb-10">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">Supplier Delivery Console</h1>
                        <p className="text-slate-500 mt-2 font-medium">Tracking inbound freight movement and cross-dock destinations.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Search Reference / Supplier"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
                            />
                        </div>
                        <button onClick={fetchManifests} className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors shadow-sm">
                            <Filter size={20} className="text-slate-600" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredManifests.length === 0 ? (
                    <div className="bg-white rounded-3xl p-20 border border-slate-100 shadow-sm flex flex-col items-center">
                        <Package size={64} className="text-slate-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-400 italic">No supply movements identified</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {filteredManifests.map(manifest => (
                            <div key={manifest.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
                                <div className="p-8">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Reference</span>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mt-1">#{manifest.manifest_reference}</h3>
                                        </div>
                                        <StatusBadge status={manifest.status} />
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier Origin</p>
                                                <p className="font-bold text-slate-900 leading-tight">{manifest.supplier.name}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                                <MapPin size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inbound Destination</p>
                                                <p className="font-bold text-slate-900 leading-tight">Central Processing Hub</p>
                                                <p className="text-[10px] text-slate-400 italic mt-0.5 uppercase">{manifest.scheduled_pickup_time ? new Date(manifest.scheduled_pickup_time).toLocaleString() : 'Scheduling Required'}</p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-slate-900">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Freight Size</p>
                                                <div className="flex items-center gap-2">
                                                    <Package size={16} className="text-blue-500" />
                                                    <span className="font-black">{manifest.total_weight_kg} <span className="text-[10px] text-slate-400">KG</span></span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {manifest.status === 'received' && (
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedManifest(manifest);
                                                            setShowAssignModal(true);
                                                        }}
                                                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
                                                    >
                                                        Assign Asset
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={async () => {
                                                        if(window.confirm(`Initiate official collection for MF-${manifest.manifest_reference}?`)) {
                                                            try {
                                                                await api.post(`inbound/manifests/${manifest.id}/start_collection/`);
                                                                toast.success("Collection Protocol Initiated");
                                                                fetchManifests();
                                                            } catch (e) {
                                                                toast.error("Bridge Error: Collection failed to start");
                                                            }
                                                        }
                                                    }}
                                                    disabled={manifest.status !== 'assigned'}
                                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-30"
                                                >
                                                    Start Collection
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                        <div className="p-8">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">Fleet Assignment</h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-8">Scheduling collection for #{selectedManifest.manifest_reference}</p>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Select Transport Unit</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={selectedVehicle}
                                        onChange={(e) => {
                                            const vId = e.target.value;
                                            setSelectedVehicle(vId);
                                            const v = vehicles.find(veh => veh.id.toString() === vId);
                                            setSelectedDriver(v ? v.assignedDriver : '');
                                        }}
                                    >
                                        <option value="">Choose a vehicle</option>
                                        {vehicles.map(v => (
                                            <option key={v.id} value={v.id}>{v.plate_number} - {v.driver_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Scheduled Window (UTC)</label>
                                    <input 
                                        type="datetime-local"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={pickupTime}
                                        onChange={(e) => setPickupTime(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Arrival Terminal / Dock</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. DOCK-04"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={dockNumber}
                                        onChange={(e) => setDockNumber(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button 
                                    onClick={() => setShowAssignModal(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={!selectedVehicle || !pickupTime || !dockNumber || assigning}
                                    onClick={async () => {
                                        setAssigning(true);
                                        try {
                                            await api.post(`inbound/manifests/${selectedManifest.id}/assign/`, {
                                                driver_id: selectedDriver,
                                                vehicle_id: selectedVehicle,
                                                scheduled_pickup_time: pickupTime,
                                                dock_number: dockNumber
                                            });
                                            toast.success("Assignment Confirmed & Driver Alerted");
                                            setShowAssignModal(false);
                                            fetchManifests();
                                        } catch (error) {
                                            toast.error("Bridge Error: Assignment failed");
                                        } finally {
                                            setAssigning(false);
                                        }
                                    }}
                                    className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                                >
                                    {assigning ? "Syncing..." : "Confirm Assignment"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierDeliveryManagement;
