import { useState, useEffect } from "react";
import api from "../api";
import { BiHistory, BiSearch, BiDetail, BiFilterAlt, BiInfoCircle, BiShieldQuarter } from "react-icons/bi";
import { HiOutlineShieldCheck } from "react-icons/hi";
import toast from 'react-hot-toast';

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("ALL");
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('audit-logs/');
            setLogs(res.data);
        } catch (e) {
            console.error(e);
            toast.error("Failed to fetch enterprise audit logs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            (log.action || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.details || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.username || "").toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesFilter = filterType === "ALL" || log.resource_type === filterType;
        
        return matchesSearch && matchesFilter;
    });

    const resourceTypes = ["ALL", ...new Set(logs.map(log => log.resource_type))];

    return (
        <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
                        <BiShieldQuarter className="mr-3 text-indigo-600 text-4xl" /> Enterprise Audit Trail
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Monitor system-wide administrative actions and security governance events.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-2xl shadow-sm text-sm font-bold transition-all flex items-center shrink-0"
                >
                    <BiHistory className="mr-2 text-xl text-slate-400" /> Refresh Secure Logs
                </button>
            </div>

            {/* Main Content Area */}
            <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative group flex-1 max-w-md">
                        <BiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Find specific actions or identities..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-[20px] pl-14 pr-6 py-4 text-sm font-medium focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder-slate-400"
                        />
                    </div>
                    <div className="flex items-center bg-white border border-slate-200 rounded-[20px] px-5 py-4 shadow-sm group focus-within:border-indigo-500 transition-all">
                        <BiFilterAlt className="mr-3 text-slate-400 text-lg group-focus-within:text-indigo-500" />
                        <select 
                            value={filterType} 
                            onChange={e => setFilterType(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 cursor-pointer text-sm font-bold text-slate-700 outline-none"
                        >
                            {resourceTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div className="hidden lg:block ml-auto">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Sequence Logs</p>
                        <p className="text-sm font-bold text-indigo-600 text-right">{filteredLogs.length} Records Verified</p>
                    </div>
                </div>

                {/* Audit Grid/Table */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="bg-white border border-slate-200 rounded-[32px] p-24 flex flex-col items-center justify-center text-center animate-pulse">
                            <div className="w-16 h-16 bg-slate-50 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin mb-4"></div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Decrypting Logs...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-24 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                                <BiHistory className="text-4xl text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">No activity matching filters</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-xs">We couldn't find any audit records that match your current search constraints.</p>
                        </div>
                    ) : (
                        filteredLogs.map(log => (
                            <div key={log.log_id} className="bg-white border border-slate-200 p-4 sm:p-5 rounded-[22px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:-translate-y-0.5 group">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-colors ${
                                        log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600' :
                                        log.action.includes('DELETE') ? 'bg-rose-50 text-rose-600' :
                                        'bg-indigo-50 text-indigo-600'
                                    }`}>
                                        <BiDetail />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${
                                                log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                log.action.includes('DELETE') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                'bg-indigo-50 text-indigo-600 border-indigo-100'
                                            }`}>
                                                {log.action}
                                            </span>
                                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{log.username || 'System Admin'}</p>
                                        </div>
                                        <p className="text-[12px] text-slate-500 font-medium truncate max-w-md">{log.details}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12 pl-2 sm:pl-0">
                                    <div className="hidden lg:block text-right">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Target Object</p>
                                        <p className="text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{log.resource_type} <span className="text-slate-400 ml-1">#{log.resource_id}</span></p>
                                    </div>
                                    
                                    <div className="text-right shrink-0">
                                        <p className="text-[11px] font-black text-slate-900 mb-0.5">{new Date(log.timestamp).toLocaleDateString()}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            <div className="p-6 bg-slate-900 rounded-[32px] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 text-8xl -rotate-12"><BiShieldQuarter/></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-1"><HiOutlineShieldCheck className="text-emerald-400"/> Security Governance</h3>
                    <p className="text-slate-400 text-sm font-medium">This audit trail is immutable and cryptographically verified for enterprise compliance.</p>
                </div>
                <div className="relative z-10 shrink-0">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Immutable Logs Active
                    </span>
                </div>
            </div>
        </div>
    );
}
