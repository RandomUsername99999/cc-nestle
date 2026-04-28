import React, { useState, useEffect } from "react";
import api from "../api";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { 
    BiSearch, BiCube, BiFilterAlt, BiRefresh, BiIntersect,
    BiTrendingUp, BiNotification, BiDownload
} from "react-icons/bi";
import { 
    Truck, Package, MapPin, AlertCircle, CheckCircle, 
    Clock, Calendar, ShieldAlert, BarChart3, Activity,
    Radar, FileText, Download, Fuel, Navigation, Warehouse,
    ArrowRightLeft, Percent, ClipboardList
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
    pending:    { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-100',  dot: 'bg-amber-400',   label: 'Pending' },
    assigned:   { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-100',   dot: 'bg-blue-400',    label: 'Assigned' },
    in_transit: { bg: 'bg-indigo-50',  text: 'text-indigo-700', border: 'border-indigo-100', dot: 'bg-indigo-400',  label: 'In Transit' },
    delivered:  { bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-100',dot: 'bg-emerald-500', label: 'Delivered' },
    completed:  { bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-100',dot: 'bg-emerald-500', label: 'Delivered' },
    delayed:    { bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-100',   dot: 'bg-rose-500',    label: 'Delayed' },
    dispatched: { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-100', dot: 'bg-purple-400',  label: 'Dispatched' },
    planned:    { bg: 'bg-slate-50',   text: 'text-slate-600',  border: 'border-slate-100',  dot: 'bg-slate-400',   label: 'Planned' },
    delivery_failed: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', dot: 'bg-rose-500', label: 'Failed' },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['pending'];
    return (
        <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1 h-1 rounded-full ${cfg.dot}`}></span>
            <span>{cfg.label}</span>
        </span>
    );
};

const MetricCard = ({ label, value, icon: Icon, color, trend }) => {
    const colors = {
        blue: "bg-blue-500",
        emerald: "bg-emerald-500",
        amber: "bg-amber-500",
        rose: "bg-rose-500",
        purple: "bg-purple-500"
    };
    return (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${colors[color]} text-white shadow-lg shadow-${color}-200`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                        <BiTrendingUp /> {trend}
                    </span>
                )}
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</h4>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">{value}</div>
        </div>
    );
};

export default function ManagerDashboard() {
    const [activeView, setActiveView] = useState("overview"); 
    const [orders, setOrders] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [pods, setPods] = useState([]);
    const [tripLogs, setTripLogs] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [activeInbound, setActiveInbound] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchData();
        const inboundRef = ref(db, 'inbound_tracking/');
        const unsub = onValue(inboundRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                setActiveInbound(Object.entries(data).map(([id, val]) => ({ id, ...val })));
            }
        });
        return () => unsub();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [oRes, sRes, pRes, tRes, eRes, trRes] = await Promise.all([
                api.get('orders/'), 
                api.get('shipments/'),
                api.get('pods/'),
                api.get('drivers/trip-logs/'),
                api.get('exceptions/'),
                api.get('warehouses/transfers/')
            ]);
            setOrders(oRes.data);
            setShipments(sRes.data);
            setPods(pRes.data);
            setTripLogs(tRes.data);
            setExceptions(eRes.data);
            setTransfers(trRes.data);
        } catch (err) {
            toast.error("Bridge Connection Failure");
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = async (endpoint, filename) => {
        try {
            toast.loading(`Preparing ${filename}...`);
            const response = await api.get(`reports/${endpoint}/`, {
                responseType: 'blob',
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${filename}.pdf`);
            document.body.appendChild(link);
            link.click();
            
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.dismiss();
            toast.success(`${filename} downloaded`);
        } catch (err) {
            toast.dismiss();
            toast.error(`Failed to generate ${filename}`);
        }
    };

    const downloadPOD = async (podId) => {
        try {
            toast.loading(`Fetching POD...`);
            const response = await api.get(`pods/${podId}/download_pod/`, {
                responseType: 'blob',
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `POD_${podId}.pdf`);
            document.body.appendChild(link);
            link.click();
            
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.dismiss();
        } catch (err) {
            toast.dismiss();
            toast.error("Failed to download Proof of Delivery");
        }
    };

    const stats = {
        total: orders.length + shipments.length,
        active: shipments.filter(s => ['dispatched', 'accepted', 'in_transit'].includes(s.status)).length,
        delivered: orders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
        failed: exceptions.length,
        onTimeRate: orders.length > 0 ? Math.round((orders.filter(o => o.status === 'delivered').length / orders.length) * 100) : 0
    };

    const allActivities = [
        ...orders.map(o => ({ ...o, type: 'order', displayId: `ORD-${o.order_id}`, date: o.created_at })),
        ...shipments.map(s => ({ ...s, type: 'shipment', displayId: `MF-${s.shipment_id}`, date: s.created_at }))
    ].sort((a,b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="min-h-screen bg-[#FBFBFB] p-4 sm:p-10 font-sans">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-5xl font-black text-slate-950 tracking-tighter">Manager Command</h1>
                    <p className="text-slate-500 font-medium text-sm mt-2">Unified operational nexus for Logistics Intelligence & Documents.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchData} className="bg-white border border-slate-200 p-4 rounded-2xl text-slate-500 hover:text-slate-900 transition-all shadow-sm">
                        <BiRefresh size={24} className={loading ? "animate-spin" : ""} />
                    </button>
                    <div className="bg-slate-950 text-white px-8 py-4 rounded-2xl shadow-xl shadow-slate-900/20 flex items-center gap-3 cursor-pointer group">
                        <ShieldAlert size={20} className="text-amber-400" />
                        <span className="text-[11px] font-black uppercase tracking-widest">System Operational</span>
                    </div>
                </div>
            </header>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                <MetricCard label="Global Activities" value={stats.total} icon={BarChart3} color="purple" trend="+12%" />
                <MetricCard label="Active Fleet" value={stats.active} icon={Truck} color="blue" />
                <MetricCard label="Delivered" value={stats.delivered} icon={CheckCircle} color="emerald" />
                <MetricCard label="On-Time Rate" value={`${stats.onTimeRate}%`} icon={Percent} color="amber" trend="98%" />
                <MetricCard label="Failed Drops" value={stats.failed} icon={AlertCircle} color="rose" />
            </div>

            {/* View Switcher */}
            <div className="flex flex-wrap items-center gap-2 mb-10 bg-slate-100/50 p-1.5 rounded-3xl w-max border border-slate-100">
                {[
                    { id: 'overview', label: 'Operations Feed', icon: Activity },
                    { id: 'documents', label: 'Management Docs', icon: FileText },
                    { id: 'trips', label: 'Driver Logs', icon: Navigation },
                    { id: 'inventory', label: 'Stock Transfers', icon: ArrowRightLeft },
                    { id: 'inbound', label: 'Inbound Radar', icon: MapPin },
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveView(id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeView === id ? 'bg-white text-slate-950 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Icon size={16} /> {label}
                    </button>
                ))}
            </div>

            {activeView === 'overview' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                    <div className="xl:col-span-2 space-y-6">
                        <div className="flex items-center justify-between px-2">
                           <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h2>
                           <div className="flex items-center gap-4">
                                <div className="relative">
                                    <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input 
                                        type="text" 
                                        placeholder="FILTER..." 
                                        className="pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-slate-500/5 outline-none w-48"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                                <BiFilterAlt className="text-slate-400 cursor-pointer" />
                           </div>
                        </div>

                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                                        <th className="px-10 py-6">Identity</th>
                                        <th className="px-10 py-6">Payload</th>
                                        <th className="px-10 py-6">Status</th>
                                        <th className="px-10 py-6 text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {allActivities.filter(a => !search || a.displayId.toLowerCase().includes(search.toLowerCase())).slice(0, 10).map(act => (
                                        <tr key={act.displayId} className="group hover:bg-slate-50/50 transition-all cursor-pointer">
                                            <td className="px-10 py-7">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-2xl ${act.type === 'shipment' ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
                                                        {act.type === 'shipment' ? <Truck size={18} /> : <Package size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-mono font-black text-slate-950 text-sm">{act.displayId}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{act.type}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-7">
                                                <p className="text-xs font-black text-slate-800 tracking-tight">
                                                    {act.type === 'shipment' ? `${act.total_weight}KG` : `${act.weight_kg}KG`}
                                                </p>
                                                <p className="text-[10px] font-medium text-slate-400 mt-1 truncate max-w-[200px]">
                                                    {act.delivery_address || "Hub Distribution"}
                                                </p>
                                            </td>
                                            <td className="px-10 py-7">
                                                <StatusBadge status={act.status} />
                                            </td>
                                            <td className="px-10 py-7 text-right text-[11px] font-bold text-slate-400">
                                                {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-blue-400">Operations Analytics</h3>
                            <div className="space-y-8 relative z-10">
                                <div>
                                    <div className="flex justify-between text-[11px] font-bold mb-3 uppercase">
                                        <span>Dispatch Ready</span>
                                        <span className="text-blue-400">85%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[85%]"></div>
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <button onClick={() => downloadReport('delivery_performance', 'Performance Analytics')} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                        <Download size={14} /> Full Analytics PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[40px] border border-slate-100 p-8">
                            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-slate-950 flex items-center gap-2">
                                <ShieldAlert size={16} className="text-rose-500" /> Failed Deliveries
                            </h3>
                            <div className="space-y-4">
                                {exceptions.slice(0, 3).map(ex => (
                                    <div key={ex.exception_id} className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                        <p className="text-[11px] font-black text-rose-900 uppercase">ORD-{ex.order} - {ex.exception_type}</p>
                                        <p className="text-[10px] font-bold text-rose-600/70 mt-1">{ex.notes || "No additional notes provided"}</p>
                                    </div>
                                ))}
                                <button onClick={() => downloadReport('failed_deliveries', 'Failed Deliveries')} className="w-full mt-2 py-3 border border-rose-100 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all">Download Exception Log</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'documents' && (
                <div className="space-y-10 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                                <Truck size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Vehicle Assignments</h3>
                            <p className="text-xs text-slate-400 mb-8 font-medium">Daily mapping of drivers to active fleet assets.</p>
                            <button onClick={() => downloadReport('vehicle_assignments', 'Vehicle Assignments')} className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">
                                <BiDownload size={16} /> Generate Sheet
                            </button>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                                <CheckCircle size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Proof of Delivery</h3>
                            <p className="text-xs text-slate-400 mb-8 font-medium">Verified recipient confirmation and signature logs.</p>
                            <div className="space-y-3">
                                {pods.slice(0, 3).map(pod => (
                                    <div key={pod.pod_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <span className="text-[10px] font-black text-slate-600">ORD-{pod.order}</span>
                                        <button onClick={() => downloadPOD(pod.pod_id)} className="text-blue-500 hover:text-blue-700"><Download size={14} /></button>
                                    </div>
                                ))}
                                {pods.length === 0 && <p className="text-[10px] italic text-slate-300">No PODs generated yet</p>}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
                                <BarChart3 size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Performance Analytics</h3>
                            <p className="text-xs text-slate-400 mb-8 font-medium">Aggregated KPI report on delivery success rates.</p>
                            <button onClick={() => downloadReport('delivery_performance', 'Performance Analytics')} className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all">
                                <BiDownload size={16} /> Export Intelligence
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'trips' && (
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
                    <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-950 tracking-tighter">Driver Trip Logs</h2>
                            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Fleet usage, mileage & fuel metrics</p>
                        </div>
                        <button onClick={() => downloadReport('driver_trip_logs', 'Trip Logs')} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">
                            <Download size={16} /> Download Full Log
                        </button>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <tr>
                                <th className="px-10 py-6">Driver Info</th>
                                <th className="px-10 py-6">Vehicle</th>
                                <th className="px-10 py-6">Time Window</th>
                                <th className="px-10 py-6">Mileage (Start/End)</th>
                                <th className="px-10 py-6 text-right">Fuel</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tripLogs.map(log => (
                                <tr key={log.log_id} className="hover:bg-slate-50/50 transition-all">
                                    <td className="px-10 py-7">
                                        <p className="font-black text-slate-900 text-sm">{log.driver_name || `Driver #${log.driver}`}</p>
                                    </td>
                                    <td className="px-10 py-7 font-mono text-[11px] font-black text-slate-500">{log.vehicle_plate || `V-${log.vehicle}`}</td>
                                    <td className="px-10 py-7 text-xs font-bold text-slate-600">
                                        {new Date(log.start_time).toLocaleString()} <br/>
                                        <span className="text-slate-300 font-medium">{log.end_time ? new Date(log.end_time).toLocaleString() : 'In Progress'}</span>
                                    </td>
                                    <td className="px-10 py-7 font-black text-slate-800 text-sm">
                                        {log.start_mileage} km → {log.end_mileage || '...'} km
                                    </td>
                                    <td className="px-10 py-7 text-right">
                                        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black">{log.fuel_consumed || 0}L</span>
                                    </td>
                                </tr>
                            ))}
                            {tripLogs.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-10 py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">No trip logs recorded in this period</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeView === 'inventory' && (
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
                    <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-950 tracking-tighter">Stock Transfer Orders</h2>
                            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Tracking movement between warehouses</p>
                        </div>
                        <button onClick={() => downloadReport('stock_transfers', 'Stock Transfers')} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all">
                            <Download size={16} /> Export Transfer Report
                        </button>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <tr>
                                <th className="px-10 py-6">Item Detail</th>
                                <th className="px-10 py-6">Source</th>
                                <th className="px-10 py-6">Destination</th>
                                <th className="px-10 py-6">Quantity</th>
                                <th className="px-10 py-6 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {transfers.map(tr => (
                                <tr key={tr.transfer_id} className="hover:bg-slate-50/50 transition-all">
                                    <td className="px-10 py-7">
                                        <div className="flex items-center gap-3">
                                            <ArrowRightLeft className="text-slate-300" size={16} />
                                            <p className="font-black text-slate-900 text-sm">{tr.item_name}</p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-7 text-xs font-bold text-slate-500">{tr.source_warehouse_name}</td>
                                    <td className="px-10 py-7 text-xs font-bold text-slate-500">{tr.destination_warehouse_name}</td>
                                    <td className="px-10 py-7 font-black text-slate-800">{tr.quantity} Units</td>
                                    <td className="px-10 py-7 text-right">
                                        <StatusBadge status={tr.status} />
                                    </td>
                                </tr>
                            ))}
                            {transfers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-10 py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">No active stock transfers found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeView === 'inbound' && (
                <div className="space-y-10 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 bg-slate-950 rounded-[56px] h-[650px] relative overflow-hidden shadow-2xl group border-4 border-white">
                             <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "30px 30px" }}></div>
                             <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <div className="relative">
                                    <Radar size={120} className="text-blue-500/20 animate-ping absolute -inset-10" />
                                    <MapPin size={64} className="text-blue-500 relative z-10 animate-bounce" />
                                  </div>
                                  <h3 className="text-2xl font-black text-white mt-10 tracking-tighter">Live Collection Radar</h3>
                             </div>
                             <div className="absolute bottom-10 left-10 right-10 flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                {activeInbound.map(run => (
                                    <div key={run.id} className="min-w-[280px] bg-white/10 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 shadow-2xl">
                                        <p className="text-[9px] font-black text-blue-400 uppercase mb-2">In Transit</p>
                                        <p className="text-white font-black tracking-tight flex items-center gap-2">
                                            <BiCube /> MF-{run.meta?.manifest_id}
                                        </p>
                                    </div>
                                ))}
                             </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 px-2">Manifest Queue</h3>
                            {activeInbound.length === 0 ? (
                                <div className="bg-white border border-slate-100 rounded-[40px] p-20 flex flex-col items-center opacity-40">
                                    <ShieldAlert size={48} className="text-slate-200 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active signals found</p>
                                </div>
                            ) : (
                                activeInbound.map(run => (
                                    <div key={run.id} className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm hover:shadow-lg transition-all group">
                                        <h4 className="text-xl font-black text-slate-900 tracking-tight mb-1">Batch: {run.meta?.manifest_id}</h4>
                                        <p className="text-xs font-medium text-slate-400 mb-6 uppercase tracking-widest">Origin: Fulfillment Center</p>
                                        <button className="w-full mt-4 py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">View Telemetry</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

