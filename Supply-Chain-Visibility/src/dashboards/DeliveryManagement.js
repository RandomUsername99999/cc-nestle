import { useState, useEffect } from "react";
import api from "../api";
import {
    BiSearch, BiPackage, BiTimeFive, BiCheckDouble,
    BiCube, BiErrorCircle, BiFilterAlt, BiRefresh
} from "react-icons/bi";
import { GiTruck } from "react-icons/gi";
import { toast } from "react-hot-toast";

const STATUS_CONFIG = {
    pending:    { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-100',  dot: 'bg-amber-400',   label: 'Pending',    icon: <BiTimeFive /> },
    assigned:   { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-100',   dot: 'bg-blue-400',    label: 'Assigned',   icon: <GiTruck /> },
    in_transit: { bg: 'bg-indigo-50',  text: 'text-indigo-700', border: 'border-indigo-100', dot: 'bg-indigo-400',  label: 'In Transit', icon: <BiCube /> },
    delivered:  { bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-100',dot: 'bg-emerald-500', label: 'Delivered',  icon: <BiCheckDouble /> },
    completed:  { bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-100',dot: 'bg-emerald-500', label: 'Delivered',  icon: <BiCheckDouble /> },
    delayed:    { bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-100',   dot: 'bg-rose-500',    label: 'Delayed',    icon: <BiErrorCircle /> },
    dispatched: { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-100', dot: 'bg-purple-400',  label: 'Dispatched', icon: <GiTruck /> },
    planned:    { bg: 'bg-slate-50',   text: 'text-slate-600',  border: 'border-slate-100',  dot: 'bg-slate-400',   label: 'Planned',    icon: <BiTimeFive /> },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['pending'];
    return (
        <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
            <span>{cfg.label}</span>
        </span>
    );
};

const StatCard = ({ label, value, icon, color, sub }) => {
    const colors = {
        coffee:  'from-coffee-500  to-coffee-400',
        indigo:  'from-indigo-500  to-indigo-400',
        emerald: 'from-emerald-500 to-emerald-400',
        rose:    'from-rose-500    to-rose-400',
        amber:   'from-amber-500   to-amber-400',
    };
    return (
        <div className="bg-white rounded-[24px] p-6 border border-coffee-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white text-2xl shadow-lg`}>
                    {icon}
                </div>
                <div className="text-right">
                    <p className="text-3xl font-black text-coffee-950 tracking-tight">{value}</p>
                </div>
            </div>
            <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest">{label}</p>
            {sub && <p className="text-[11px] text-coffee-300 font-medium mt-0.5">{sub}</p>}
        </div>
    );
};

const DeliveryManagement = () => {
    const [orders, setOrders]       = useState([]);
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter]     = useState("all");
    const [activeTab, setActiveTab]       = useState("all");

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [ordersRes, shipmentsRes] = await Promise.all([
                api.get('orders/'),
                api.get('shipments/')
            ]);
            setOrders(ordersRes.data || []);
            setShipments(shipmentsRes.data || []);
        } catch (error) {
            toast.error("Failed to sync delivery activities.");
        } finally {
            setLoading(false);
        }
    };

    // Merge and normalize
    const allActivities = [
        ...orders.map(o => ({
            id: `ORD-${o.order_id}`,
            rawId: o.order_id,
            type: 'order',
            status: o.status,
            origin: o.pickup_address,
            destination: o.delivery_address,
            payload: `${o.quantity} units • ${o.weight_kg}kg`,
            created: o.created_at,
            driver: null,
            vehicle: null,
            shipmentType: o.shipment_type,
        })),
        ...shipments.map(s => ({
            id: `MF-${s.shipment_id}`,
            rawId: s.shipment_id,
            type: 'shipment',
            status: s.status,
            origin: s.orders?.[0]?.order_details?.pickup_address || '—',
            destination: s.orders?.[0]?.order_details?.delivery_address || '—',
            payload: `${s.total_weight}kg • ${s.total_volume}m³`,
            created: s.created_at,
            driver: s.driver_name,
            vehicle: s.vehicle_plate,
            shipmentType: null,
        })),
    ].sort((a, b) => new Date(b.created) - new Date(a.created));

    // Stats
    const stats = {
        total:    allActivities.length,
        inTransit: allActivities.filter(a => ['in_transit', 'dispatched'].includes(a.status)).length,
        delivered: allActivities.filter(a => ['delivered', 'completed'].includes(a.status)).length,
        delayed:   allActivities.filter(a => a.status === 'delayed').length,
        pending:   allActivities.filter(a => a.status === 'pending').length,
    };

    // Filtering
    const filtered = allActivities.filter(a => {
        const matchSearch = search === "" ||
            a.id.toLowerCase().includes(search.toLowerCase()) ||
            a.origin?.toLowerCase().includes(search.toLowerCase()) ||
            a.destination?.toLowerCase().includes(search.toLowerCase()) ||
            a.driver?.toLowerCase().includes(search.toLowerCase()) ||
            a.vehicle?.toLowerCase().includes(search.toLowerCase());

        const matchStatus = statusFilter === "all" || a.status === statusFilter;
        const matchType   = typeFilter === "all"   || a.type === typeFilter;
        const matchTab    = activeTab === "all"
            ? true
            : activeTab === "in_transit" ? ['in_transit','dispatched'].includes(a.status)
            : activeTab === "completed"  ? ['delivered','completed'].includes(a.status)
            : a.status === activeTab;

        return matchSearch && matchStatus && matchType && matchTab;
    });

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-coffee-900 tracking-tight">Delivery Management</h1>
                    <p className="text-coffee-500 font-medium mt-1">Complete overview of all inbound and outbound delivery activities.</p>
                </div>
                <button
                    onClick={fetchAll}
                    className="flex items-center space-x-2 border border-coffee-200 bg-white hover:bg-coffee-50 text-coffee-600 px-5 py-3 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95"
                >
                    <BiRefresh className={`text-xl ${loading ? 'animate-spin' : ''}`} />
                    <span>Sync Live Data</span>
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Activities" value={stats.total}     icon={<BiPackage />}    color="coffee"  />
                <StatCard label="In Transit"       value={stats.inTransit} icon={<GiTruck />}      color="indigo"  sub="Active movements" />
                <StatCard label="Delivered"        value={stats.delivered} icon={<BiCheckDouble />} color="emerald" sub="Successfully completed" />
                <StatCard label="Delayed"          value={stats.delayed}   icon={<BiErrorCircle />} color="rose"    sub="Require attention" />
                <StatCard label="Pending"          value={stats.pending}   icon={<BiTimeFive />}   color="amber"   sub="Awaiting dispatch" />
            </div>

            {/* Quick Tab Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                {[
                    { key: 'all',        label: 'All Activities' },
                    { key: 'pending',    label: 'Pending' },
                    { key: 'in_transit', label: 'In Transit' },
                    { key: 'completed',  label: 'Completed' },
                    { key: 'delayed',    label: 'Delayed' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                            activeTab === tab.key
                                ? 'bg-coffee-900 text-white border-coffee-900 shadow-md shadow-coffee-900/20'
                                : 'bg-white text-coffee-500 border-coffee-100 hover:border-coffee-300 hover:text-coffee-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search & Filters Row */}
            <div className="bg-white rounded-[24px] border border-coffee-100 shadow-sm p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full group">
                    <BiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-coffee-300 text-xl group-focus-within:text-coffee-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by order ID, address, driver, vehicle..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-5 py-3.5 bg-coffee-50/50 border border-coffee-100 rounded-[18px] text-sm font-medium text-coffee-900 placeholder-coffee-300 focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-400 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <BiFilterAlt className="text-coffee-400 text-lg" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-coffee-50 border border-coffee-100 rounded-xl px-4 py-3 text-[11px] font-black text-coffee-700 outline-none focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-400 transition-all"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_transit">In Transit</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="delivered">Delivered</option>
                        <option value="completed">Completed</option>
                        <option value="delayed">Delayed</option>
                        <option value="planned">Planned</option>
                    </select>
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="bg-coffee-50 border border-coffee-100 rounded-xl px-4 py-3 text-[11px] font-black text-coffee-700 outline-none focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-400 transition-all"
                    >
                        <option value="all">All Types</option>
                        <option value="order">Orders</option>
                        <option value="shipment">Manifests</option>
                    </select>
                </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold text-coffee-400 uppercase tracking-widest">
                    Showing <span className="text-coffee-700">{filtered.length}</span> of {allActivities.length} activities
                </p>
                {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
                    <button
                        onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setActiveTab('all'); }}
                        className="text-[11px] font-black text-coffee-500 hover:text-coffee-900 transition-all uppercase tracking-widest"
                    >
                        Clear Filters ✕
                    </button>
                )}
            </div>

            {/* Activity Table */}
            <div className="bg-white rounded-[24px] border border-coffee-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-coffee-50/40 border-b border-coffee-50">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400">ID</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400">Type</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400">Route</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400">Payload</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400">Asset</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-coffee-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-coffee-300 text-sm">
                                        <div className="flex flex-col items-center space-y-3">
                                            <BiRefresh className="animate-spin text-3xl text-coffee-200" />
                                            <span className="font-medium">Synchronizing delivery registry...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-coffee-300 text-sm">
                                        <div className="flex flex-col items-center space-y-3">
                                            <BiPackage className="text-4xl text-coffee-100" />
                                            <span className="font-medium">No activities match the current filters.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(activity => (
                                <tr key={activity.id} className="hover:bg-coffee-50/20 transition-all group">
                                    <td className="px-6 py-5">
                                        <span className="font-black text-sm text-coffee-900 font-mono">#{activity.id}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                            activity.type === 'order'
                                                ? 'bg-coffee-50 text-coffee-600 border-coffee-100'
                                                : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                        }`}>
                                            {activity.type === 'order' ? 'Order' : 'Manifest'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 max-w-[200px]">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center space-x-2 overflow-hidden">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                                                <span className="text-[11px] font-medium text-coffee-500 truncate">{activity.origin || '—'}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 overflow-hidden">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                                <span className="text-[11px] font-medium text-coffee-500 truncate">{activity.destination || '—'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-[11px] font-bold text-coffee-700">{activity.payload}</p>
                                        {activity.shipmentType && (
                                            <span className="text-[9px] font-black uppercase text-coffee-400 bg-coffee-50 px-2 py-0.5 rounded-md mt-1 inline-block capitalize">{activity.shipmentType}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        {activity.driver ? (
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-bold text-coffee-800">{activity.driver}</p>
                                                <p className="text-[9px] font-black text-coffee-400 uppercase tracking-widest font-mono">{activity.vehicle}</p>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-coffee-200 font-medium">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge status={activity.status} />
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-[11px] font-medium text-coffee-400">
                                            {activity.created ? new Date(activity.created).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div className="px-6 py-4 border-t border-coffee-50 bg-coffee-50/20 flex items-center justify-between">
                        <p className="text-[10px] font-black text-coffee-300 uppercase tracking-widest">{filtered.length} records rendered</p>
                        <span className="text-[10px] font-black text-coffee-300 uppercase tracking-widest">Live Registry • Auto-sync</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryManagement;
