import { useState, useEffect, useCallback } from "react";
import api from "../api";
import { 
    BiPlus, BiPencil, BiTrash, BiCube, 
    BiCheckCircle, BiTime, BiErrorCircle 
} from "react-icons/bi";
import { toast } from "react-hot-toast";
import FilterPanel from "../components/FilterPanel";
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { QRCodeSVG } from 'qrcode.react';

// Fix leaflet marker icon resolution issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

const LocationSelector = ({ onChange }) => {
    useMapEvents({
        click(e) {
            onChange(`Lat: ${e.latlng.lat.toFixed(5)}, Lng: ${e.latlng.lng.toFixed(5)}`);
        },
    });
    return null;
};

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [orderFilter, setOrderFilter] = useState('assigned');

    // Form State
    const [formData, setFormData] = useState({
        shipment_type: 'package',
        quantity: 1,
        weight_kg: '',
        volume_m3: '',
        requires_refrigeration: false,
        pickup_address: '',
        delivery_address: '',
    });

    const [expandedQR, setExpandedQR] = useState(null);

    const fetchOrders = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const hasQueryParams = params.q || params.status || params.requires_refrigeration;
            const endpoint = hasQueryParams ? 'search/deliveries/' : 'orders/';
            const res = await api.get(endpoint, { params });
            // The search endpoint returns { results: [...] }, the direct endpoint returns [...]
            setOrders(hasQueryParams ? res.data.results : res.data);
        } catch (error) {
            toast.error("Failed to sync order inventory.");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleSaveOrder = async (e) => {
        e.preventDefault();
        try {
            if (currentOrder) {
                await api.put(`orders/${currentOrder.order_id}/`, formData);
                toast.success("Order parameters updated.");
            } else {
                const res = await api.post('orders/', formData);
                toast.success("New order provisioned into the system.");
                
                // Track locally created orders for dispatch suggestions
                try {
                    const sessionOrders = JSON.parse(sessionStorage.getItem('created_orders') || '[]');
                    if (res.data && res.data.order_id) {
                        sessionOrders.push(res.data.order_id);
                        sessionStorage.setItem('created_orders', JSON.stringify(sessionOrders));
                    }
                } catch(e) {}
            }
            setIsModalOpen(false);
            fetchOrders();
        } catch (error) {
            toast.error(error.response?.data?.error || "Transaction failed.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to decommission this order?")) return;
        try {
            await api.delete(`orders/${id}/`);
            toast.success("Order record purged.");
            fetchOrders();
        } catch (error) {
            toast.error(error.response?.data[0] || "Order is locked and cannot be deleted.");
        }
    };

    const openModal = (order = null) => {
        if (order) {
            if (order.status !== 'pending') {
                toast.error("Assigned orders are immutable.");
                return;
            }
            setCurrentOrder(order);
            setFormData({
                shipment_type: order.shipment_type,
                quantity: order.quantity,
                weight_kg: order.weight_kg,
                volume_m3: order.volume_m3,
                requires_refrigeration: order.requires_refrigeration,
                pickup_address: order.pickup_address,
                delivery_address: order.delivery_address,
            });
        } else {
            setCurrentOrder(null);
            setFormData({
                shipment_type: 'package',
                quantity: 1,
                weight_kg: '',
                volume_m3: '',
                requires_refrigeration: false,
                pickup_address: '',
                delivery_address: '',
            });
        }
        setIsModalOpen(true);
    };

    const getStatusBadge = (status) => {
        const configs = {
            pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <BiTime />, label: 'Pending' },
            assigned: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <BiCheckCircle />, label: 'Assigned' },
            in_transit: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: <BiCube className="animate-pulse" />, label: 'In Transit' },
            delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <BiCheckCircle />, label: 'Delivered' },
            delayed: { bg: 'bg-rose-50', text: 'text-rose-700', icon: <BiErrorCircle />, label: 'Delayed' },
        };
        const config = configs[status] || configs.pending;
        return (
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
                {config.icon}
                <span>{config.label}</span>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in px-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[24px] shadow-sm border border-coffee-100">
                <div>
                    <h1 className="text-2xl font-black text-coffee-950 tracking-tight">Order Management</h1>
                    <p className="text-coffee-500 font-medium text-sm mt-1">Lifecycle control for pending and active logistics requests.</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="flex items-center space-x-2 bg-[#3E2723] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#4E342E] transition-all shadow-lg active:scale-95"
                >
                    <BiPlus className="text-xl" />
                    <span>Create New Order</span>
                </button>
            </div>

            {/* Filters & Content */}
            <div className="bg-white rounded-[24px] shadow-sm border border-coffee-100 overflow-hidden">
                <div className="p-3 border-b border-coffee-50 bg-coffee-50/20">
                   <FilterPanel onFilter={fetchOrders} entityType="orders" />
                </div>
                
                <div className="p-4 border-b border-coffee-50">
                    <div className="flex items-center gap-3 bg-coffee-50/50 p-1.5 rounded-3xl w-max">
                        {['assigned', 'in_transit', 'delivered'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setOrderFilter(tab)}
                                className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${orderFilter === tab ? 'bg-white text-coffee-950 shadow-sm border border-coffee-200' : 'text-coffee-400 hover:text-coffee-600'}`}
                            >
                                {tab === 'assigned' ? 'Assigned' : tab === 'in_transit' ? 'Picked Up' : 'Delivered'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-coffee-50/30 text-[10px] font-black uppercase tracking-widest text-coffee-400 border-b border-coffee-50">
                            <tr>
                                <th className="px-6 py-4">Order ID</th>
                                <th className="px-6 py-4">Shipment Type</th>
                                <th className="px-6 py-4">Quantity / Payload</th>
                                <th className="px-6 py-4">Logistics Node</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-coffee-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-coffee-300 text-sm">Synchronizing registry...</td>
                                </tr>
                            ) : orders.filter(o => {
                                if (orderFilter === 'assigned') return ['pending', 'assigned', 'delayed'].includes(o.status);
                                if (orderFilter === 'in_transit') return ['in_transit'].includes(o.status);
                                if (orderFilter === 'delivered') return ['delivered'].includes(o.status);
                                return true;
                            }).length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-coffee-300 text-sm">No matching order records found for this status.</td>
                                </tr>
                            ) : orders.filter(o => {
                                if (orderFilter === 'assigned') return ['pending', 'assigned', 'delayed'].includes(o.status);
                                if (orderFilter === 'in_transit') return ['in_transit'].includes(o.status);
                                if (orderFilter === 'delivered') return ['delivered'].includes(o.status);
                                return true;
                            }).map(order => (
                                <tr key={order.order_id} className="hover:bg-coffee-50/10 transition-all group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="bg-white p-1 rounded-lg border border-coffee-100 shadow-sm shrink-0 cursor-pointer hover:shadow-md hover:scale-110 hover:-rotate-2 transition-all" 
                                                title="Expand QR Code"
                                                onClick={() => setExpandedQR({url: `${window.location.origin}/admin/orders?id=${order.order_id}`, id: `ORDER-${order.order_id}`})}
                                            >
                                                <QRCodeSVG value={`${window.location.origin}/admin/orders?id=${order.order_id}`} size={32} fgColor="#3E2723" />
                                            </div>
                                            <span className="font-black text-coffee-900 text-sm">#ORD-{order.order_id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-7 h-7 rounded-lg bg-coffee-50 flex items-center justify-center text-coffee-600">
                                                    <BiCube className="text-sm" />
                                                </div>
                                                <span className="text-sm font-bold text-coffee-700 capitalize">{order.shipment_type}</span>
                                            </div>
                                            {order.requires_refrigeration && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 mt-1 self-start">
                                                    Cold Chain
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-black text-coffee-950">{order.quantity} Units</p>
                                        <p className="text-[10px] font-bold text-coffee-400 mt-0.5">{order.weight_kg}kg • {order.volume_m3}m³</p>
                                    </td>
                                    <td className="px-6 py-5 max-w-[200px]">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center space-x-1.5 overflow-hidden">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></div>
                                                <span className="text-[11px] font-medium text-coffee-500 truncate">{order.pickup_address}</span>
                                            </div>
                                            <div className="flex items-center space-x-1.5 overflow-hidden">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                                                <span className="text-[11px] font-medium text-coffee-500 truncate">{order.delivery_address}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">{getStatusBadge(order.status)}</td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button 
                                                onClick={() => openModal(order)}
                                                disabled={order.status !== 'pending'}
                                                className={`p-2 rounded-lg transition-all ${order.status === 'pending' ? 'text-coffee-400 hover:text-coffee-900 hover:bg-coffee-50' : 'text-coffee-100 cursor-not-allowed'}`}
                                            >
                                                <BiPencil className="text-lg" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(order.order_id)}
                                                disabled={order.status !== 'pending'}
                                                className={`p-2 rounded-lg transition-all ${order.status === 'pending' ? 'text-coffee-400 hover:text-rose-600 hover:bg-rose-50' : 'text-coffee-100 cursor-not-allowed'}`}
                                            >
                                                <BiTrash className="text-lg" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-[#3E2723]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-[24px] w-full max-w-xl shadow-2xl border border-coffee-100 animate-fade-in-up my-auto max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-coffee-50 shrink-0">
                            <h2 className="text-xl font-black text-coffee-950 tracking-tight">{currentOrder ? 'Edit Identity Parameters' : 'Provision New Order'}</h2>
                            <p className="text-coffee-500 font-medium text-xs mt-0.5">Configure logistics payload and destination targets.</p>
                        </div>
                        
                        <form onSubmit={handleSaveOrder} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Shipment Type</label>
                                    <select 
                                        value={formData.shipment_type}
                                        onChange={(e) => setFormData({...formData, shipment_type: e.target.value})}
                                        className="w-full bg-coffee-50/50 border border-coffee-100 rounded-xl px-4 py-2.5 text-sm font-bold text-coffee-900 focus:outline-none focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-300 transition-all"
                                    >
                                        <option value="package">Package</option>
                                        <option value="pallet">Pallet</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Quantity</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                        className="w-full bg-coffee-50/50 border border-coffee-100 rounded-xl px-4 py-2.5 text-sm font-bold text-coffee-900 focus:outline-none focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-300 transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Weight (KG)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.weight_kg}
                                        onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
                                        className="w-full bg-coffee-50/50 border border-coffee-100 rounded-xl px-4 py-2.5 text-sm font-bold text-coffee-900 focus:outline-none focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-300 transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Volume (m³)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.volume_m3}
                                        onChange={(e) => setFormData({...formData, volume_m3: e.target.value})}
                                        className="w-full bg-coffee-50/50 border border-coffee-100 rounded-xl px-4 py-2.5 text-sm font-bold text-coffee-900 focus:outline-none focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-300 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-3 bg-coffee-50/30 p-3 rounded-xl border border-coffee-100">
                                <input 
                                    type="checkbox" 
                                    id="refrig_order"
                                    checked={formData.requires_refrigeration}
                                    onChange={(e) => setFormData({...formData, requires_refrigeration: e.target.checked})}
                                    className="w-4 h-4 rounded border-coffee-300 text-coffee-950 focus:ring-coffee-500"
                                />
                                <label htmlFor="refrig_order" className="text-xs font-bold text-coffee-700">Requires Refrigeration (Cooling Chain)</label>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Pickup Address</label>
                                <textarea 
                                    value={formData.pickup_address}
                                    onChange={(e) => setFormData({...formData, pickup_address: e.target.value})}
                                    className="w-full bg-coffee-50/50 border border-coffee-100 rounded-xl px-4 py-2 text-sm font-bold text-coffee-900 focus:outline-none focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-300 h-20 resize-none transition-all"
                                    placeholder="Source collection address..."
                                    required
                                />
                            </div>

                            <div className="space-y-1.5 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Delivery Address & Geo-Targeting</label>
                                <div className="flex gap-3 h-40">
                                    <textarea 
                                        value={formData.delivery_address}
                                        onChange={(e) => setFormData({...formData, delivery_address: e.target.value})}
                                        className="w-1/2 bg-coffee-50/50 border border-coffee-100 rounded-xl px-4 py-2 text-sm font-bold text-coffee-900 focus:outline-none focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-300 resize-none transition-all"
                                        placeholder="Enter address manually or click map..."
                                        required
                                    />
                                    <div className="w-1/2 rounded-xl border border-coffee-100 overflow-hidden relative z-0">
                                        <MapContainer center={[6.92708, 79.86124]} zoom={12} style={{width: '100%', height: '100%'}}>
                                            <TileLayer 
                                               url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
                                               attribution='&copy; <a href="https://carto.com/">Carto</a>'
                                            />
                                            <LocationSelector onChange={(str) => setFormData({...formData, delivery_address: str})} />
                                        </MapContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-coffee-50">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 text-sm font-bold text-coffee-400 hover:text-coffee-600 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="bg-[#3E2723] text-white px-8 py-2.5 rounded-xl font-bold hover:bg-[#4E342E] transition-all shadow-md active:scale-95"
                                >
                                    {currentOrder ? 'Update Record' : 'Create Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Expansion Modal */}
            {expandedQR && (
                <div 
                    className="fixed inset-0 bg-[#3E2723]/80 backdrop-blur-md flex flex-col items-center justify-center z-[100] p-6 animate-fade-in" 
                    onClick={() => setExpandedQR(null)}
                >
                    <div className="bg-white p-10 rounded-[32px] shadow-2xl flex flex-col items-center border border-coffee-100 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-white p-4 rounded-2xl shadow-inner border border-coffee-50 mb-2">
                            <QRCodeSVG value={expandedQR.url} size={256} fgColor="#3E2723" />
                        </div>
                        <p className="mt-6 font-black text-2xl text-coffee-950 tracking-widest font-mono">{expandedQR.id}</p>
                        <p className="mt-1 text-sm text-coffee-400 font-bold uppercase tracking-widest">Driver Pickup Confirmation Code</p>
                        <button 
                            type="button"
                            onClick={() => setExpandedQR(null)} 
                            className="mt-8 bg-coffee-50 hover:bg-coffee-100 text-coffee-800 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                        >
                            Close Viewer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManagement;
