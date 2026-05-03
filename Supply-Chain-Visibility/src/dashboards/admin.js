import React, { useState, useEffect } from "react";
import api from "../api";
import { 
    MdLocalShipping, MdWarning, MdMap, MdOutlinePayments, 
    MdTrendingUp, MdHistory, MdNotificationsActive, MdArrowForward
} from "react-icons/md";
import { 
    Truck, Package, Users, ShieldCheck, 
    AlertTriangle, Activity, BarChart3, Database
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const [analyticsRes, logsRes] = await Promise.all([
                    api.get('reports/delivery_analytics/'),
                    api.get('audit-logs/')
                ]);
                setAnalytics(analyticsRes.data);
                setAuditLogs(logsRes.data.slice(0, 5));
            } catch (err) {
                toast.error("Network sync failure: Dashboard may show stale data.");
            }
            setLoading(false);
        };
        fetchDashboardData();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-coffee-700"></div>
        </div>
    );

    const stats = analytics?.summary || {};

    return (
        <div className="space-y-10 animate-fade-in pb-20 max-w-[1600px] mx-auto">
            
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-coffee-950/5 p-8 rounded-[40px] border border-coffee-100">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-coffee-900 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full">Primary Hub</span>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[9px] font-black uppercase tracking-widest">Real-time Cloud Sync</span>
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-coffee-950 tracking-tighter">Logistics Command Center</h1>
                    <p className="text-coffee-600 font-medium mt-2 max-w-xl">Global operations overview, fleet intelligence, and automated dispatch monitoring.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest">Global Status</p>
                        <p className="text-lg font-black text-coffee-900">Optimal Performance</p>
                    </div>
                    <div className="w-14 h-14 bg-white rounded-2xl border border-coffee-100 flex items-center justify-center shadow-sm">
                        <Activity className="text-coffee-900 animate-pulse" size={24} />
                    </div>
                </div>
            </div>

            {/* KPI Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard 
                    title="Active Fleet Utilization" 
                    value="92%" 
                    icon={Truck} 
                    trend="+4.2%" 
                    color="blue"
                    desc="Assets in operational rotation"
                />
                <KPICard 
                    title="On-Time Delivery Rate" 
                    value={`${stats.on_time_rate || 0}%`} 
                    icon={ShieldCheck} 
                    trend="+1.5%" 
                    color="emerald"
                    desc="Vs. 95% target baseline"
                />
                <KPICard 
                    title="Total Fleet Revenue" 
                    value={`$${(stats.total_orders || 0) * 45}`} 
                    icon={MdOutlinePayments} 
                    trend="+12%" 
                    color="amber"
                    desc="Projected yield current period"
                />
                <KPICard 
                    title="Exception Threshold" 
                    value={`${stats.failed || 0}`} 
                    icon={AlertTriangle} 
                    trend="-2" 
                    color="rose"
                    desc="Active delivery failures"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Audit Intelligence Feed */}
                <div className="xl:col-span-1 bg-white rounded-[40px] border border-coffee-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-coffee-50 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-coffee-400 flex items-center gap-3">
                            <MdHistory className="text-coffee-900 text-xl" /> System Audit Trail
                        </h3>
                        <button className="p-2 hover:bg-coffee-50 rounded-xl transition-colors text-coffee-400"><MdArrowForward size={18}/></button>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {auditLogs.map((log) => (
                            <div key={log.id} className="p-5 bg-coffee-50/30 rounded-3xl border border-coffee-50 hover:bg-white hover:border-coffee-200 transition-all group">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="px-2 py-0.5 bg-coffee-900 text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                                        {log.action}
                                    </span>
                                    <span className="text-[9px] font-bold text-coffee-300 font-mono">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-[11px] font-bold text-coffee-800 line-clamp-2 leading-relaxed">
                                    {log.details}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="p-6 bg-coffee-50/50 text-center mt-auto">
                        <button className="text-[10px] font-black uppercase tracking-widest text-coffee-400 hover:text-coffee-900 transition-colors">Open Security Center</button>
                    </div>
                </div>

                {/* Operations Heatmap Summary */}
                <div className="xl:col-span-2 bg-coffee-950 rounded-[40px] shadow-2xl shadow-coffee-950/20 p-1 relative overflow-hidden flex flex-col min-h-[600px]">
                    {/* Dark Mode Map Experience */}
                    <div className="absolute inset-0 z-0 opacity-20" style={{ 
                        backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
                        backgroundSize: '40px 40px' 
                    }}></div>
                    
                    <div className="relative z-10 p-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Active Distribution Grid</h3>
                                <p className="text-coffee-400 text-xs font-medium mt-1 uppercase tracking-widest">Real-time GPS data via Telematics</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-white/10 backdrop-blur rounded-2xl border border-white/10">
                                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Units Active</p>
                                    <p className="text-lg font-black text-white">44 / 50</p>
                                </div>
                                <div className="px-4 py-2 bg-emerald-500/20 backdrop-blur rounded-2xl border border-emerald-500/20">
                                    <p className="text-[9px] font-black text-emerald-400/50 uppercase tracking-widest">Operational Success</p>
                                    <p className="text-lg font-black text-emerald-400">98.4%</p>
                                </div>
                            </div>
                        </div>

                        {/* Interactive "Nodes" Visualization */}
                        <div className="flex-1 relative">
                             {/* Central Hub */}
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/5 rounded-full border border-white/10 flex items-center justify-center">
                                <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_20px_white]"></div>
                             </div>
                             
                             {/* Branching Nodes */}
                             <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                             <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6]"></div>
                             
                             <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                             <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-amber-500 rounded-full shadow-[0_0_15px_#f59e0b]"></div>

                             <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-emerald-500 rounded-full"></div>
                             <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981]"></div>
                        </div>

                        <div className="mt-auto pt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="p-6 bg-white/5 backdrop-blur rounded-[32px] border border-white/10">
                                <BarChart3 className="text-white mb-4" size={20} />
                                <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Weekly Volume</h4>
                                <p className="text-xl font-black text-white">1,248 Units</p>
                             </div>
                             <div className="p-6 bg-white/5 backdrop-blur rounded-[32px] border border-white/10">
                                <Database className="text-white mb-4" size={20} />
                                <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Cloud Latency</h4>
                                <p className="text-xl font-black text-white">14ms</p>
                             </div>
                             <div className="p-6 bg-coffee-500/20 backdrop-blur rounded-[32px] border border-coffee-500/20 group hover:bg-coffee-500 transition-all cursor-pointer">
                                <MdMap className="text-white mb-4" size={24} />
                                <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Launch Intelligence</h4>
                                <p className="text-xl font-black text-white flex items-center gap-2">Live Tracker <MdArrowForward/></p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon: Icon, trend, color, desc }) {
    const colorMap = {
        blue: "bg-blue-500 shadow-blue-500/20 text-blue-600",
        emerald: "bg-emerald-500 shadow-emerald-500/20 text-emerald-600",
        amber: "bg-amber-500 shadow-amber-500/20 text-amber-600",
        rose: "bg-rose-500 shadow-rose-500/20 text-rose-600"
    };

    return (
        <div className="bg-white p-8 rounded-[40px] border border-coffee-100 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl ${colorMap[color].split(' ')[0]}`}>
                    <Icon size={28} />
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${colorMap[color].split(' ')[2]} bg-opacity-10`}>
                    {trend}
                </span>
            </div>
            <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-coffee-950 tracking-tight">{value}</h3>
            </div>
            <p className="text-[10px] font-bold text-coffee-300 mt-2">{desc}</p>
        </div>
    );
}