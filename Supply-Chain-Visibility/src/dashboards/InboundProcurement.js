import React, { useState, useEffect } from 'react';
import { Truck, Package, MapPin, AlertCircle, CheckCircle, Clock, Calendar, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import api from '../api';
import toast from 'react-hot-toast';

const InboundProcurement = () => {
    const [activeTab, setActiveTab] = useState('active'); // active, logs
    const [activeRuns, setActiveRuns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
        // Real-time tracking of inbound runs
        const trackingRef = ref(db, 'inbound_tracking/');
        const unsubscribe = onValue(trackingRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setActiveRuns(Object.entries(data).map(([id, info]) => ({ id, ...info })));
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="p-8 bg-[#0B0F19] min-h-screen text-slate-100 font-inter">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Inbound & Procurement</h1>
                    <p className="text-slate-400 mt-1">Manage supplier deliveries, driver assignments, and live collections.</p>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 mb-6">
                <button 
                  onClick={() => setActiveTab('active')}
                  className={`py-3 px-6 font-semibold text-sm transition-colors ${activeTab === 'active' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}>
                  Active Collections
                </button>
                <button 
                  onClick={() => setActiveTab('logs')}
                  className={`py-3 px-6 font-semibold text-sm transition-colors ${activeTab === 'logs' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                  Receipt & Discrepancy Log
                </button>
            </div>


            {/* Tab: Active Collections */}
            {activeTab === 'active' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl h-[500px] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[#0B0F19] opacity-90 p-4" style={{ backgroundImage: "radial-gradient(#1E293B 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <MapPin size={48} className="text-blue-500 mb-4 animate-pulse" />
                            <h3 className="text-lg font-bold text-white mb-1">Live Map Feed Active</h3>
                            <p className="text-slate-400 text-sm">Tracking {activeRuns.length} drivers via Firebase.</p>
                        </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Truck className="text-blue-400"/> Live Fleets</h2>
                        <div className="space-y-4">
                            {activeRuns.length === 0 && <p className="text-slate-500 text-sm">No drivers currently in transit.</p>}
                            {activeRuns.map(run => (
                                <div key={run.id} className="border-l-2 border-blue-500 pl-4 py-2">
                                    <p className="text-sm font-bold text-white">Driver ID: {run.meta?.driver_id}</p>
                                    <p className="text-xs text-slate-400 mt-1">MF ID: {run.meta?.manifest_id}</p>
                                    <p className="text-xs text-slate-500 mt-1">Departed: {new Date(run.meta?.departed_at).toLocaleTimeString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Receipt & Logs */}
            {activeTab === 'logs' && (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-lg font-bold mb-6">Completed Collections</h2>
                    <p className="text-slate-400">Reconciliation summaries will appear here once collections are completed.</p>
                    {/* Placeholder for discrepancy log */}
                    <div className="mt-4 p-4 border border-red-900/30 bg-red-900/10 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-red-400 mt-1" size={20} />
                            <div>
                                <h4 className="font-bold text-red-200">MF-002: Damaged Goods Reported</h4>
                                <p className="text-sm text-red-300/70">Driver reported 50kg damage. Awaiting procurement review.</p>
                                <button className="mt-3 text-xs bg-red-900/40 hover:bg-red-900/60 transition-colors text-white px-3 py-1 rounded">Raise with supplier</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default InboundProcurement;
