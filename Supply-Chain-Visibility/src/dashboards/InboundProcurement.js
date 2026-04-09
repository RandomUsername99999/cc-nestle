import React, { useState, useEffect } from 'react';
import { Truck, Package, MapPin, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

const InboundProcurement = () => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [activeRuns, setActiveRuns] = useState([]);
    const [stats, setStats] = useState({ pending: 0, inTransit: 0, received: 0 });

    useEffect(() => {
        // Fetch stats and data (simulated)
        setStats({ pending: 12, inTransit: 5, received: 45 });
        setPurchaseOrders([
            { id: 'PO-9912', supplier: 'EcoPackaging Ltd', status: 'Assigned', items: 3, eta: '14:30' },
            { id: 'PO-9913', supplier: 'TechParts Corp', status: 'Pending', items: 5, eta: '16:00' },
            { id: 'PO-9914', supplier: 'Global Logistics', status: 'Received', items: 2, eta: '10:00' },
        ]);

        // Real-time tracking of inbound runs
        const trackingRef = ref(db, 'inbound_tracking/');
        const unsubscribe = onValue(trackingRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setActiveRuns(Object.entries(data).map(([id, info]) => ({ id, ...info })));
            }
        });

        return () => unsubscribe();
    }, []);

    const StatusBadge = ({ status }) => {
        const colors = {
            'Pending': 'bg-gray-800 text-gray-400 border-gray-700',
            'Assigned': 'bg-indigo-900/30 text-indigo-400 border-indigo-800',
            'In Transit': 'bg-blue-900/30 text-blue-400 border-blue-800',
            'Received': 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colors[status] || colors['Pending']}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="p-8 bg-[#0B0F19] min-h-screen text-slate-100 font-inter">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Inbound & Procurement</h1>
                    <p className="text-slate-400 mt-1">Manage supplier runs and purchase order fulfillment.</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold transition-all">
                        Create Purchase Order
                    </button>
                    <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-semibold border border-slate-700 transition-all">
                        Schedule Supplier Run
                    </button>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { label: 'Pending Collections', value: stats.pending, icon: Package, color: 'text-indigo-400' },
                    { label: 'En Route to Warehouse', value: stats.inTransit, icon: Truck, color: 'text-blue-400' },
                    { label: 'Total Received (MTD)', value: stats.received, icon: CheckCircle, color: 'text-emerald-400' }
                ].map((s, idx) => (
                    <div key={idx} className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-sm font-medium">{s.label}</p>
                                <h3 className="text-2xl font-bold mt-2">{s.value}</h3>
                            </div>
                            <div className={`${s.color} bg-slate-800/50 p-2 rounded-lg`}>
                                <s.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Procurement Table */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Clock className="text-indigo-400" size={18} />
                            Today's Procurement Tasks
                        </h2>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">PO Reference</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Estimated Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {purchaseOrders.map((po) => (
                                <tr key={po.id} className="hover:bg-slate-800/20 transition-colors cursor-pointer">
                                    <td className="px-6 py-4 font-mono text-indigo-400">{po.id}</td>
                                    <td className="px-6 py-4 font-medium">{po.supplier}</td>
                                    <td className="px-6 py-4 text-slate-400">{po.items} lines</td>
                                    <td className="px-6 py-4"><StatusBadge status={po.status} /></td>
                                    <td className="px-6 py-4 text-slate-400">{po.eta}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Real-time Tracking Feed */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <MapPin className="text-blue-400" size={18} />
                        Live Driver Status
                    </h2>
                    <div className="space-y-6">
                        {activeRuns.length === 0 ? (
                            <div className="text-center py-8">
                                <Truck className="mx-auto text-slate-700 mb-2" size={32} />
                                <p className="text-slate-500 text-sm">No active inbound runs detected.</p>
                            </div>
                        ) : (
                            activeRuns.map((run) => (
                                <div key={run.id} className="border-l-2 border-indigo-500 pl-4 py-2">
                                    <p className="text-sm font-bold text-white uppercase">{run.id}</p>
                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                        <AlertCircle size={10} /> En route to {run.dest || 'Warehouse'}
                                    </p>
                                    <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 w-[65%]" />
                                    </div>
                                </div>
                            ))
                        )}
                        
                        {/* Demo static entry if no live data */}
                        {activeRuns.length === 0 && (
                            <div className="border-l-2 border-indigo-500 pl-4 py-2 opacity-60">
                                <p className="text-sm font-bold text-white uppercase">RUN-AB102</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                    <CheckCircle size={10} className="text-emerald-500" /> Collection Verified
                                </p>
                                <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[85%]" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InboundProcurement;
