import { useState, useEffect } from "react";
import api from "../api";
import { 
    BiSearch, BiFilterAlt, BiPackage, BiUser, 
    BiMapPin, BiCheckDouble, BiTimeFive, BiChevronRight, BiCube, BiSelection, BiX
} from "react-icons/bi";
import { GiTruck } from "react-icons/gi";
import { toast } from "react-hot-toast";
import { QRCodeSVG } from 'qrcode.react';

const ShipmentManifest = () => {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [zoomedQR, setZoomedQR] = useState(null);

    useEffect(() => {
        fetchShipments();
    }, []);

    const deleteManifest = async (id) => {
        if(!window.confirm("Permanent deletion of this manifest audit?")) return;
        try {
            await api.delete(`shipments/${id}/`);
            toast.success("Manifest purged.");
            fetchShipments();
        } catch (error) {
            toast.error("Failed to delete manifest.");
        }
    };

    const fetchShipments = async () => {
        setLoading(true);
        try {
            const res = await api.get('shipments/');
            setShipments(res.data);
        } catch (error) {
            toast.error("Failed to load manifestations.");
        }
        setLoading(false);
    };

    const getStatusBadge = (status) => {
        const configs = {
            planned: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <BiTimeFive />, label: 'Planned' },
            dispatched: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: <GiTruck />, label: 'Dispatched' },
            in_transit: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <BiCube className="animate-pulse" />, label: 'In Transit' },
            completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <BiCheckDouble />, label: 'Delivered' },
        };
        const config = configs[status] || configs.planned;
        return (
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.text}`}>
                {config.icon}
                <span>{config.label}</span>
            </div>
        );
    };

    const filteredShipments = shipments.filter(s => 
        s.shipment_id.toString().includes(searchTerm) || 
        s.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.driver_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in px-4 relative">
            {/* QR Zoom Modal */}
            {zoomedQR && (
                <div 
                    className="fixed inset-0 z-[100] bg-coffee-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
                    onClick={() => setZoomedQR(null)}
                >
                    <div 
                        className="bg-white p-10 rounded-[40px] shadow-2xl relative flex flex-col items-center max-w-sm w-full animate-scale-up"
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setZoomedQR(null)}
                            className="absolute top-6 right-6 p-2 bg-coffee-50 rounded-full text-coffee-600 hover:bg-coffee-100 transition-colors"
                        >
                            <BiX className="text-2xl" />
                        </button>
                        <div className="bg-white p-6 rounded-3xl border-4 border-coffee-900 shadow-inner mb-6">
                            <QRCodeSVG value={zoomedQR.value} size={250} fgColor="#3E2723" />
                        </div>
                        <h3 className="text-xl font-black text-coffee-950 mb-1">Manifest QR Code</h3>
                        <p className="text-sm text-coffee-400 font-bold uppercase tracking-widest">#{zoomedQR.id}</p>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="bg-white p-6 rounded-[24px] shadow-sm border border-coffee-100 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-coffee-950 tracking-tight">Logistics Manifests</h1>
                    <p className="text-coffee-500 font-medium text-sm mt-1">Full audit trail and tracking for deployed shipments.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest">Active Assets</p>
                        <p className="text-sm font-black text-coffee-950">{shipments.length} Active Manifests</p>
                    </div>
                    <div className="w-12 h-12 bg-coffee-50 rounded-2xl flex items-center justify-center text-coffee-700 border border-coffee-100">
                        <BiSelection className="text-2xl" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Manifest List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-4 rounded-[24px] shadow-sm border border-coffee-100 flex items-center space-x-4">
                        <BiSearch className="text-coffee-300 text-xl" />
                        <input 
                            type="text" 
                            placeholder="Search by Manifest ID, Vehicle or Driver..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none placeholder-coffee-200"
                        />
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-12 text-coffee-300">Retrieving secure manifest history...</div>
                        ) : filteredShipments.length === 0 ? (
                            <div className="text-center py-12 text-coffee-300 bg-white rounded-[24px] border border-dashed border-coffee-100">No active manifests found for the current parameters.</div>
                        ) : filteredShipments.map(shipment => (
                            <div 
                                key={shipment.shipment_id} 
                                onClick={() => setSelectedShipment(shipment)}
                                className={`group bg-white p-6 rounded-[24px] shadow-sm border transition-all cursor-pointer hover:shadow-md ${selectedShipment?.shipment_id === shipment.shipment_id ? 'border-coffee-900 ring-4 ring-coffee-900/5' : 'border-coffee-50 hover:border-coffee-100'}`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div 
                                            className="bg-white p-1.5 rounded-lg border border-coffee-100 shadow-sm shrink-0 hover:scale-110 hover:border-coffee-400 transition-all cursor-zoom-in"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setZoomedQR({
                                                    id: `MF-${shipment.shipment_id}`,
                                                    value: `${window.location.origin}/admin/shipments?id=${shipment.shipment_id}`
                                                });
                                            }}
                                        >
                                            <QRCodeSVG value={`${window.location.origin}/admin/shipments?id=${shipment.shipment_id}`} size={36} fgColor="#3E2723" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-coffee-950">Manifest #MF-{shipment.shipment_id}</h3>
                                            <p className="text-[10px] text-coffee-400 font-bold uppercase tracking-wider mt-0.5">Created: {new Date(shipment.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {getStatusBadge(shipment.status)}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-coffee-300 uppercase tracking-widest">Asset</p>
                                        <div className="flex items-center space-x-2">
                                            <GiTruck className="text-coffee-600" />
                                            <span className="text-xs font-black text-coffee-700">{shipment.vehicle_plate}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-coffee-300 uppercase tracking-widest">Operator</p>
                                        <div className="flex items-center space-x-2">
                                            <BiUser className="text-coffee-600" />
                                            <span className="text-xs font-black text-coffee-700">{shipment.driver_name}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-coffee-300 uppercase tracking-widest">Payload</p>
                                        <p className="text-xs font-black text-coffee-950">{shipment.total_weight}kg • {shipment.total_volume}m³</p>
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <BiChevronRight className={`text-2xl transition-all ${selectedShipment?.shipment_id === shipment.shipment_id ? 'text-coffee-900 translate-x-1' : 'text-coffee-200 group-hover:text-coffee-400'}`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detail View */}
                <div className="lg:col-span-1">
                    {selectedShipment ? (
                        <div className="bg-white rounded-[24px] shadow-sm border border-coffee-100 p-6 sticky top-8 animate-fade-in">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-black text-coffee-950 tracking-tight">Manifest Contents</h2>
                                <span className="bg-coffee-900 text-white text-[10px] font-black px-2 py-0.5 rounded-md">{selectedShipment.orders.length} ITEMS</span>
                            </div>

                            <div className="space-y-4">
                                {selectedShipment.orders.map((mapping, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-coffee-50/50 border border-coffee-100 transition-all hover:bg-coffee-50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black text-coffee-900">ORD-{mapping.order_details.order_id}</span>
                                            <span className="text-[10px] font-black uppercase text-coffee-400">{mapping.order_details.shipment_type}</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-start space-x-2 overflow-hidden">
                                                <div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 "></div>
                                                <p className="text-[11px] font-medium text-coffee-500 truncate">{mapping.order_details.pickup_address}</p>
                                            </div>
                                            <div className="flex items-start space-x-2 overflow-hidden">
                                                <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5"></div>
                                                <p className="text-[11px] font-medium text-coffee-500 truncate">{mapping.order_details.delivery_address}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-coffee-50 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-coffee-400 uppercase tracking-widest">Temperature Guard</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${selectedShipment.requires_refrigeration ? 'bg-rose-50 text-rose-600' : 'bg-coffee-50 text-coffee-500'}`}>
                                        {selectedShipment.requires_refrigeration ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => deleteManifest(selectedShipment.shipment_id)}
                                        className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                        Purge Audit
                                    </button>
                                    <button className="flex-1 bg-[#3E2723] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-coffee-900/20 active:scale-95 transition-all">
                                        Print Manifest
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-coffee-50/30 rounded-[24px] border border-dashed border-coffee-100 p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-coffee-200 mb-4 shadow-sm">
                                <BiPackage className="text-3xl" />
                            </div>
                            <p className="text-sm font-bold text-coffee-300">Select a manifest to view personnel and payload details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShipmentManifest;
