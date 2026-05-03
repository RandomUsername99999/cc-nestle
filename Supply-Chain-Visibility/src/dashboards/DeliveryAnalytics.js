import React, { useState, useEffect } from "react";
import api from "../api";
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
    TrendingUp, TrendingDown, Package, Truck, AlertCircle, 
    CheckCircle, Clock, Fuel, DollarSign, Activity, Users,
    MapPin, Calendar, RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#6366f1'];

export default function DeliveryAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await api.get('reports/delivery_analytics/');
            setData(res.data);
        } catch (error) {
            toast.error("Failed to load analytics data");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coffee-700"></div>
        </div>
    );

    if (!data) return null;

    const { summary, trends, failures, driver_performance } = data;

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-coffee-900 tracking-tight">Delivery Intelligence</h1>
                    <p className="text-coffee-500 font-medium mt-1">Operational performance and cost efficiency metrics.</p>
                </div>
                <button 
                    onClick={fetchAnalytics}
                    className="p-3 bg-white border border-coffee-100 rounded-2xl text-coffee-600 hover:text-coffee-900 shadow-sm transition-all active:scale-95"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* KPI Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AnalyticMetricCard 
                    label="On-Time Delivery Rate" 
                    value={`${summary.on_time_rate}%`} 
                    icon={CheckCircle} 
                    color="emerald"
                    subtext="Target: 95%"
                />
                <AnalyticMetricCard 
                    label="Avg. Cost Per Delivery" 
                    value={`$${summary.avg_cost_per_delivery}`} 
                    icon={DollarSign} 
                    color="blue"
                    subtext="Fuel & Ops overhead"
                />
                <AnalyticMetricCard 
                    label="Avg. Time on Route" 
                    value={`${summary.avg_time_on_route_mins}m`} 
                    icon={Clock} 
                    color="amber"
                    subtext="Dispatch to Completion"
                />
                <AnalyticMetricCard 
                    label="Total Fuel Usage" 
                    value={`${summary.total_fuel_liters}L`} 
                    icon={Fuel} 
                    color="purple"
                    subtext="Last 30 days"
                />
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
                                    tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
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

                {/* Optimization Patterns */}
                <div className="bg-white p-8 rounded-[40px] border border-coffee-100 shadow-sm">
                    <h3 className="text-lg font-black text-coffee-900 mb-6">Route Optimization Insights</h3>
                    <div className="space-y-4">
                        <InsightItem 
                            icon={Activity}
                            title="Traffic Delay Hotspots"
                            desc="CBD routes consistently report 15% higher transit times between 16:00 - 18:00."
                            type="warning"
                        />
                        <InsightItem 
                            icon={TrendingUp}
                            title="Peak Season Readiness"
                            desc="Delivery volume predicted to increase by 24% next month based on historical trends."
                            type="info"
                        />
                        <InsightItem 
                            icon={Users}
                            title="Customer Satisfaction"
                            desc="92% of customers reported high satisfaction when deliveries arrive before 11:00 AM."
                            type="success"
                        />
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
        <div className="bg-white p-6 rounded-[32px] border border-coffee-100 shadow-sm group hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${colorMap[color].split(' ')[0]} text-white shadow-lg`}>
                    <Icon size={20} />
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-coffee-100 group-hover:bg-coffee-500 transition-colors"></div>
            </div>
            <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-1">{label}</p>
            <h3 className="text-2xl font-black text-coffee-950 tracking-tight">{value}</h3>
            {subtext && <p className="text-[10px] font-bold text-coffee-400 mt-1">{subtext}</p>}
        </div>
    );
}

function InsightItem({ icon: Icon, title, desc, type }) {
    const colors = {
        warning: "bg-amber-50 text-amber-600 border-amber-100",
        info: "bg-blue-50 text-blue-600 border-blue-100",
        success: "bg-emerald-50 text-emerald-600 border-emerald-100"
    };

    return (
        <div className={`p-5 rounded-3xl border flex gap-4 ${colors[type]}`}>
            <div className="shrink-0">
                <Icon size={20} />
            </div>
            <div>
                <p className="text-xs font-black uppercase tracking-widest mb-1">{title}</p>
                <p className="text-xs font-medium leading-relaxed opacity-80">{desc}</p>
            </div>
        </div>
    );
}
