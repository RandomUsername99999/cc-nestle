import React, { useState, useEffect } from "react";
import api from "../api";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    TrendingUp, AlertCircle,
    CheckCircle, Fuel, DollarSign, Activity, RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#6366f1'];

export default function DeliveryAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        date_from: '',
        date_to: '',
        driver_id: '',
        vehicle_id: '',
        requires_refrigeration: ''
    });

    const fetchAnalytics = async (params = filters) => {
        setLoading(true);
        try {
            // Remove empty strings from params
            const activeParams = Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== '')
            );
            const res = await api.get('reports/delivery_analytics/', { params: activeParams });
            setData(res.data);
        } catch (error) {
            toast.error("Failed to load analytics data");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        const reset = {
            date_from: '',
            date_to: '',
            driver_id: '',
            vehicle_id: '',
            requires_refrigeration: ''
        };
        setFilters(reset);
        fetchAnalytics(reset);
    };

    if (loading && !data) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-coffee-700"></div>
                <p className="text-coffee-400 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Synthesizing Intelligence...</p>
            </div>
        </div>
    );

    if (!data) return null;

    const { summary, trends, failures, driver_performance } = data;

    const Clock = (props) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
    );

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-20 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="animate-slide-in-left">
                    <h1 className="text-4xl font-black text-coffee-900 tracking-tighter">Delivery Intelligence</h1>
                    <p className="text-coffee-500 font-medium mt-1">Real-time operational performance and cost efficiency telemetry.</p>
                </div>
                <div className="flex items-center gap-3 animate-slide-in-right">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 ${isFilterOpen ? 'bg-coffee-950 text-white' : 'bg-white border border-coffee-100 text-coffee-600 hover:bg-coffee-50'}`}
                    >
                        <Activity size={16} />
                        Advanced Search
                    </button>
                    <button
                        onClick={() => fetchAnalytics()}
                        className="p-3 bg-white border border-coffee-100 rounded-2xl text-coffee-600 hover:text-coffee-900 hover:rotate-180 transition-all duration-500 shadow-sm active:scale-95"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Advanced Search Panel */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isFilterOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-white border border-coffee-100 rounded-[32px] p-8 shadow-xl mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Date Range (Start)</label>
                            <input 
                                type="date" 
                                value={filters.date_from}
                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                className="w-full bg-coffee-50/50 border border-coffee-50 rounded-xl px-4 py-2.5 text-xs font-bold text-coffee-900 focus:outline-none focus:ring-4 focus:ring-coffee-500/10 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Date Range (End)</label>
                            <input 
                                type="date" 
                                value={filters.date_to}
                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                className="w-full bg-coffee-50/50 border border-coffee-50 rounded-xl px-4 py-2.5 text-xs font-bold text-coffee-900 focus:outline-none focus:ring-4 focus:ring-coffee-500/10 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Driver Profile ID</label>
                            <input 
                                type="number" 
                                placeholder="e.g. 101"
                                value={filters.driver_id}
                                onChange={(e) => handleFilterChange('driver_id', e.target.value)}
                                className="w-full bg-coffee-50/50 border border-coffee-50 rounded-xl px-4 py-2.5 text-xs font-bold text-coffee-900 focus:outline-none focus:ring-4 focus:ring-coffee-500/10 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Vehicle Asset ID</label>
                            <input 
                                type="number" 
                                placeholder="e.g. 15"
                                value={filters.vehicle_id}
                                onChange={(e) => handleFilterChange('vehicle_id', e.target.value)}
                                className="w-full bg-coffee-50/50 border border-coffee-50 rounded-xl px-4 py-2.5 text-xs font-bold text-coffee-900 focus:outline-none focus:ring-4 focus:ring-coffee-500/10 transition-all"
                            />
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-coffee-50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                             <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={filters.requires_refrigeration === 'true'}
                                    onChange={(e) => handleFilterChange('requires_refrigeration', e.target.checked ? 'true' : '')}
                                    className="w-4 h-4 rounded border-coffee-200 text-coffee-900 focus:ring-coffee-500"
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-coffee-500 group-hover:text-coffee-900 transition-colors">Cold Chain Requirement</span>
                             </label>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={clearFilters}
                                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-coffee-400 hover:text-rose-500 transition-all"
                            >
                                Reset Filters
                            </button>
                            <button 
                                onClick={() => fetchAnalytics()}
                                className="bg-coffee-950 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-coffee-900 transition-all shadow-lg active:scale-95"
                            >
                                Apply Parameters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                    <AnalyticMetricCard
                        label="On-Time Delivery Rate"
                        value={`${summary.on_time_rate}%`}
                        icon={CheckCircle}
                        color="emerald"
                        subtext="Target: 95%"
                    />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                    <AnalyticMetricCard
                        label="Avg. Cost Per Delivery"
                        value={`$${summary.avg_cost_per_delivery}`}
                        icon={DollarSign}
                        color="blue"
                        subtext="Fuel & Ops overhead"
                    />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-225">
                    <AnalyticMetricCard
                        label="Avg. Time on Route"
                        value={`${summary.avg_time_on_route_mins}m`}
                        icon={Clock}
                        color="amber"
                        subtext="Dispatch to Completion"
                    />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                    <AnalyticMetricCard
                        label="Total Fuel Usage"
                        value={`${summary.total_fuel_liters}L`}
                        icon={Fuel}
                        color="purple"
                        subtext="Last 30 days"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Delivery Trends Chart */}
                <div className="bg-white p-8 rounded-[40px] border border-coffee-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black text-coffee-900">Delivery Volume Trends</h3>
                        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Orders</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Delivered</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height={300} minHeight={0} minWidth={0} debounce={50}>
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                />
                                <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Failure Analysis */}
                <div className="bg-white p-8 rounded-[40px] border border-coffee-100 shadow-sm">
                    <h3 className="text-lg font-black text-coffee-900 mb-8">Delivery Exception Analysis</h3>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="h-[250px] w-full md:w-1/2">
                            <ResponsiveContainer width="100%" height={250} minHeight={0} minWidth={0} debounce={50}>
                                <PieChart>
                                    <Pie
                                        data={failures}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="exception_type"
                                    >
                                        {failures.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 space-y-4">
                            {failures.length > 0 ? failures.map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-coffee-50/30 rounded-2xl border border-coffee-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-xs font-bold text-coffee-700 capitalize">{f.exception_type.replace(/_/g, ' ')}</span>
                                    </div>
                                    <span className="text-xs font-black text-coffee-900">{f.count}</span>
                                </div>
                            )) : (
                                <p className="text-sm text-coffee-400 text-center py-10 font-medium">No exceptions recorded.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Driver Performance Ranking */}
                <div className="bg-white p-8 rounded-[40px] border border-coffee-100 shadow-sm">
                    <h3 className="text-lg font-black text-coffee-900 mb-8">Top Performer Utilization</h3>
                    <div className="space-y-6">
                        {driver_performance.map((d, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-700 font-black text-xs">
                                            #{i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-coffee-900">{d.driver__employee__full_name || "Unknown Driver"}</p>
                                            <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">{d.completed_trips} / {d.total_trips} Success rate</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-emerald-600">
                                        {Math.round((d.completed_trips / d.total_trips) * 100)}%
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-coffee-50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-coffee-700 rounded-full transition-all duration-1000"
                                        style={{ width: `${(d.completed_trips / d.total_trips) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dynamic Insights from Backend */}
                <div className="bg-white p-8 rounded-[40px] border border-coffee-100 shadow-sm">
                    <h3 className="text-lg font-black text-coffee-900 mb-6">Route Optimization Insights</h3>
                    <div className="space-y-4">
                        {data.insights && data.insights.length > 0 ? data.insights.map((insight, idx) => {
                            let Icon = Activity;
                            if (insight.type === 'info') Icon = TrendingUp;
                            if (insight.type === 'success') Icon = CheckCircle;
                            if (insight.type === 'warning') Icon = AlertCircle;

                            return (
                                <InsightItem
                                    key={idx}
                                    icon={Icon}
                                    title={insight.title}
                                    desc={insight.desc}
                                    type={insight.type}
                                />
                            );
                        }) : (
                            <p className="text-sm text-coffee-400 text-center py-6 font-medium">Insufficient data to generate patterns yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnalyticMetricCard({ label, value, icon: Icon, color, subtext }) {
    const colorMap = {
        emerald: "bg-emerald-500 shadow-emerald-100 text-emerald-500",
        blue: "bg-blue-500 shadow-blue-100 text-blue-500",
        amber: "bg-amber-500 shadow-amber-100 text-amber-500",
        purple: "bg-purple-500 shadow-purple-100 text-purple-500"
    };

    return (
        <div className="bg-white p-6 rounded-[32px] border border-coffee-100 shadow-sm group hover:shadow-2xl hover:-translate-y-2 hover:border-coffee-200 transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-coffee-50/20 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${colorMap[color].split(' ')[0]} text-white shadow-lg group-hover:rotate-12 transition-transform`}>
                    <Icon size={20} />
                </div>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-coffee-100 group-hover:bg-coffee-500 transition-colors delay-75"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-coffee-100 group-hover:bg-coffee-500 transition-colors delay-150"></div>
                </div>
            </div>
            <p className="text-[10px] font-black text-coffee-400 uppercase tracking-[0.15em] mb-1 relative z-10">{label}</p>
            <h3 className="text-3xl font-black text-coffee-950 tracking-tight group-hover:text-black transition-colors relative z-10">{value}</h3>
            {subtext && <p className="text-[10px] font-bold text-coffee-400 mt-1 relative z-10">{subtext}</p>}
        </div>
    );
}

function InsightItem({ icon: Icon, title, desc, type }) {
    const colors = {
        warning: "bg-amber-50 text-amber-700 border-amber-100/50 shadow-amber-900/5",
        info: "bg-blue-50 text-blue-700 border-blue-100/50 shadow-blue-900/5",
        success: "bg-emerald-50 text-emerald-700 border-emerald-100/50 shadow-emerald-900/5"
    };

    return (
        <div className={`p-5 rounded-[24px] border flex gap-5 transition-all hover:scale-[1.02] hover:shadow-lg ${colors[type]} animate-in fade-in slide-in-from-right-4 duration-500`}>
            <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-white/50 backdrop-blur-sm border border-current opacity-20`}>
                <Icon size={24} className="opacity-100" />
            </div>
            <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">{title}</p>
                <p className="text-xs font-bold leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
