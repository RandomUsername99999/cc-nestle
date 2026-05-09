import React, { useState } from 'react';
import api from '../api';
import { 
    BiSearch, BiFilterAlt, BiDownload, BiSearchAlt, 
    BiPackage, BiUser, BiDetail
} from 'react-icons/bi';
import { Truck, AlertCircle, FileText, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const SearchResultCard = ({ type, data }) => {
    const icons = {
        order: <BiPackage className="text-blue-500" size={24} />,
        shipment: <Truck className="text-emerald-500" size={24} />,
        vehicle: <Truck className="text-amber-500" size={24} />,
        user: <BiUser className="text-purple-500" size={24} />,
        audit: <BiDetail className="text-slate-500" size={24} />
    };

    const getTitle = () => {
        if (type === 'order') return `Order #${data.order_id}`;
        if (type === 'shipment') return `Shipment #${data.shipment_id}`;
        if (type === 'vehicle') return data.plate_number;
        if (type === 'user') return data.username;
        if (type === 'audit') return data.action;
        return 'Unknown';
    };

    const getSubtitle = () => {
        if (type === 'order') return data.delivery_address;
        if (type === 'shipment') return `Driver: ${data.driver_name || 'N/A'}`;
        if (type === 'vehicle') return `${data.make_model} (${data.capacity}kg)`;
        if (type === 'user') return data.role;
        if (type === 'audit') return `${data.user} @ ${new Date(data.timestamp).toLocaleString()}`;
        return '';
    };

    return (
        <div className="bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all group flex items-center justify-between">
            <div className="flex items-center gap-5">
                <div className="p-4 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">
                    {icons[type]}
                </div>
                <div>
                    <h4 className="font-black text-slate-900 text-lg tracking-tight uppercase">{getTitle()}</h4>
                    <p className="text-xs font-medium text-slate-400 mt-0.5 truncate max-w-[300px]">{getSubtitle()}</p>
                </div>
            </div>
            <button className="p-3 text-slate-300 hover:text-slate-950 transition-colors">
                <BiDetail size={20} />
            </button>
        </div>
    );
};

export default function AdvancedSearch() {
    const [query, setQuery] = useState('');
    const [searchType, setSearchType] = useState('all'); // all, orders, shipments, vehicles, audits
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setHasSearched(true);
        try {
            const res = await api.get('search/', {
                params: { q: query, type: searchType }
            });
            setResults(res.data);
        } catch (error) {
            toast.error("Search system currently offline");
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto font-sans animate-fade-in">
            {/* Page Header */}
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-slate-950 text-white p-2 rounded-lg">
                        <BiSearchAlt size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Enterprise Data Mining</span>
                </div>
                <h1 className="text-5xl font-black text-slate-950 tracking-tighter">Advanced Search</h1>
                <p className="text-slate-500 font-medium mt-2">Universal query engine for supply chain assets, records, and telemetry.</p>
            </header>

            {/* Search Input Section */}
            <div className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-xl shadow-slate-200/20 mb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -translate-y-32 translate-x-32 opacity-50"></div>
                
                <form onSubmit={handleSearch} className="relative z-10 space-y-8">
                    <div className="relative">
                        <BiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-2xl" />
                        <input 
                            type="text"
                            placeholder="QUERY BY ID, NAME, PLATE, ADDRESS, ACTION..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-16 pr-6 py-7 bg-slate-50/50 border border-slate-100 rounded-[24px] text-sm font-black uppercase tracking-widest placeholder-slate-300 focus:outline-none focus:ring-8 focus:ring-slate-50 transition-all shadow-inner"
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'Universal', icon: Activity },
                                { id: 'orders', label: 'Orders', icon: BiPackage },
                                { id: 'shipments', label: 'Shipments', icon: Truck },
                                { id: 'vehicles', label: 'Vehicles', icon: Truck },
                                { id: 'audits', label: 'Audit Logs', icon: FileText },
                            ].map(type => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setSearchType(type.id)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${searchType === type.id ? 'bg-slate-950 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400 hover:text-slate-600'}`}
                                >
                                    <type.icon size={14} />
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        <button 
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                        >
                            {loading ? 'Processing...' : 'Execute Query'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4 mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                        {results.length} Matches Found
                    </h3>
                    <div className="flex gap-4">
                        <BiFilterAlt className="text-slate-300 cursor-pointer hover:text-slate-900 transition-colors" />
                        <BiDownload className="text-slate-300 cursor-pointer hover:text-slate-900 transition-colors" />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                        {[1, 2, 4, 5].map(i => (
                            <div key={i} className="h-28 bg-slate-50 border border-slate-100 rounded-[24px]"></div>
                        ))}
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {results.map((res, idx) => (
                            <SearchResultCard key={idx} type={res.type} data={res.data} />
                        ))}
                    </div>
                ) : hasSearched ? (
                    <div className="py-24 flex flex-col items-center justify-center bg-white border border-slate-50 rounded-[40px] text-center px-10">
                        <AlertCircle size={48} className="text-slate-100 mb-6" />
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Zero Intersections Found</h4>
                        <p className="text-slate-400 text-xs mt-2 max-w-xs">The search query did not correlate with any records in the current database partition.</p>
                    </div>
                ) : (
                    <div className="py-24 flex flex-col items-center justify-center opacity-20 text-center">
                        <BiSearchAlt size={80} className="text-slate-400 mb-6" />
                        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Enter a query to begin mining data</p>
                    </div>
                )}
            </div>
        </div>
    );
}
