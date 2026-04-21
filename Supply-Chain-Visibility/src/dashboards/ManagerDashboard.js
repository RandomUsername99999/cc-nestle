import React, { useState, useEffect } from "react";
import api from "../api";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { 
    BiSearch, BiCube, BiFilterAlt, BiRefresh, BiIntersect,
    BiTrendingUp, BiNotification
} from "react-icons/bi";
import { 
    Truck, Package, MapPin, AlertCircle, CheckCircle, 
    Clock, Calendar, ShieldAlert, BarChart3, Activity,
    Radar
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
    const [activeView, setActiveView] = useState("overview"); // overview, inbound, outbound
    const [orders, setOrders] = useState([]);
    const [shipments, setShipments] = useState([]);
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
            const [oRes, sRes] = await Promise.all([api.get('orders/'), api.get('shipments/')]);
            setOrders(oRes.data);
            setShipments(sRes.data);
        } catch (err) {
            toast.error("Bridge Connection Failure");
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total: orders.length + shipments.length,
        active: shipments.filter(s => ['dispatched', 'accepted', 'in_transit'].includes(s.status)).length,
        delivered: orders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
        inbound: activeInbound.length,
        pending: orders.filter(o => o.status === 'pending').length
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
                    <p className="text-slate-500 font-medium text-sm mt-2">Unified operational nexus for Procurement, Dispatch & Inbound Logistics.</p>
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
                <MetricCard label="Active Outbound" value={stats.active} icon={Truck} color="blue" />
                <MetricCard label="Live Inbound" value={stats.inbound} icon={MapPin} color="amber" />
                <MetricCard label="Delivered" value={stats.delivered} icon={CheckCircle} color="emerald" trend="98%" />
                <MetricCard label="Pending Pool" value={stats.pending} icon={Clock} color="rose" />
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-2 mb-10 bg-slate-100/50 p-1.5 rounded-3xl w-max border border-slate-100">
                {[
                    { id: 'overview', label: 'Operations Feed', icon: Activity },
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
                    {/* Activity Feed */}
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
                                        <th className="px-10 py-6">Payload Detail</th>
                                        <th className="px-10 py-6">Status Marker</th>
                                        <th className="px-10 py-6 text-right">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {allActivities.filter(a => !search || a.displayId.toLowerCase().includes(search.toLowerCase())).slice(0, 15).map(act => (
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
                                                    {act.type === 'shipment' ? `${act.total_weight}KG Payload` : `${act.weight_kg}KG Shipment`}
                                                </p>
                                                <p className="text-[10px] font-medium text-slate-400 mt-1 truncate max-w-[200px]">
                                                    {act.delivery_address || act.orders?.[0]?.order_details?.delivery_address || "Multiple Drops"}
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

                    {/* Right Sidebar: Health Metrics */}
                    <div className="space-y-8">
                        <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-blue-400">Hub Efficiency Radar</h3>
                            <div className="space-y-8 relative z-10">
                                <div>
                                    <div className="flex justify-between text-[11px] font-bold mb-3 uppercase tracking-wider">
                                        <span>Dispatch Ready</span>
                                        <span className="text-blue-400">85%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[85%]"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[11px] font-bold mb-3 uppercase tracking-wider">
                                        <span>Inbound Flow</span>
                                        <span className="text-amber-400">62%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 w-[62%]"></div>
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Generate Full Report</button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[40px] border border-slate-100 p-8">
                            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-slate-950 flex items-center gap-2">
                                <BiNotification className="text-rose-500" /> Operational Alerts
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex gap-4">
                                    <ShieldAlert className="text-rose-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-[11px] font-black text-rose-900 uppercase leading-normal">Driver delay reported: ID #104</p>
                                        <p className="text-[10px] font-bold text-rose-600/70 uppercase italic mt-1">Route: NJ -> NYC</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
                                    <BiIntersect className="text-blue-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-[11px] font-black text-blue-900 uppercase leading-normal">Inbound Batch Received</p>
                                        <p className="text-[10px] font-bold text-blue-600/70 uppercase italic mt-1">Warehouse: WH-NYC-01</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'inbound' && (
                <div className="space-y-10 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 bg-slate-950 rounded-[56px] h-[650px] relative overflow-hidden shadow-2xl group border-4 border-white shadow-slate-200">
                             <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "30px 30px" }}></div>
                             <div className="absolute inset-0 flex flex-col items-center justify-center">
                                 <div className="relative">
                                    <Radar size={120} className="text-blue-500/20 animate-ping absolute -inset-10" />
                                    <MapPin size={64} className="text-blue-500 relative z-10 animate-bounce" />
                                 </div>
                                 <h3 className="text-2xl font-black text-white mt-10 tracking-tighter">Live Collection Radar</h3>
                                 <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Active Signal: {activeInbound.length} Units</p>
                             </div>
                             
                             {/* Floating Fleet Cards */}
                             <div className="absolute bottom-10 left-10 right-10 flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                {activeInbound.map(run => (
                                    <div key={run.id} className="min-w-[280px] bg-white/10 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 shadow-2xl">
                                        <p className="text-[9px] font-black text-blue-400 uppercase mb-2">In Transit</p>
                                        <p className="text-white font-black tracking-tight flex items-center gap-2">
                                            <BiCube /> MF-{run.meta?.manifest_id}
                                        </p>
                                        <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400">
                                            <span>Driver ID: {run.meta?.driver_id}</span>
                                            <span className="text-white bg-blue-600 px-2 py-0.5 rounded-full">{new Date(run.meta?.departed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 px-2">Manifest Queue</h3>
                            {activeInbound.length === 0 ? (
                                <div className="bg-white border border-slate-100 rounded-[40px] p-20 flex flex-col items-center opacity-40">
                                    <ShieldAlert size={48} className="text-slate-200 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">No active signals found in the sector</p>
                                </div>
                            ) : (
                                activeInbound.map(run => (
                                    <div key={run.id} className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm hover:shadow-lg transition-all group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                                                <BiCube size={24} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-slate-300 group-hover:text-slate-900 transition-colors">Manifest Active</span>
                                        </div>
                                        <h4 className="text-xl font-black text-slate-900 tracking-tight mb-1">Batch: {run.meta?.manifest_id}</h4>
                                        <p className="text-xs font-medium text-slate-400 mb-6 font-mono text-xs">Origin: Regional Fulfillment</p>
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-slate-400">Driver Assignment</span>
                                                <span className="text-slate-900">{run.meta?.driver_id}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-slate-400">Signal Start</span>
                                                <span className="text-slate-900">{new Date(run.meta?.departed_at).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                        <button className="w-full mt-8 py-4 bg-slate-50 group-hover:bg-slate-950 group-hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">View Full Telemetry</button>
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

