import React, { useState, useEffect } from 'react';
import { BiSearch, BiFilterAlt, BiTimeFive, BiCheckCircle, BiErrorCircle } from 'react-icons/bi';

export default function FilterPanel({ onFilter, entityType = 'orders' }) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilter({ q: query, ...activeFilters });
    }, 400);
    return () => clearTimeout(timer);
  }, [query, activeFilters, onFilter]);

  const toggleFilter = (key, value) => {
    setActiveFilters(prev => {
      const next = { ...prev };
      if (next[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const clearFilters = () => {
    setQuery('');
    setActiveFilters({});
  };

  return (
    <div className="bg-white rounded-[32px] border border-coffee-100 shadow-sm overflow-hidden transition-all duration-700 hover:shadow-xl hover:border-coffee-200">
      <div className="p-4 flex items-center gap-4">
        <div className="relative flex-1 group">
          <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-300 text-lg group-focus-within:text-coffee-600 transition-colors" />
          <input 
            type="text" 
            placeholder={`Search ${entityType}... (e.g. "Cold Chain", "WH-001", "delivered")`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-coffee-50/50 border-none rounded-2xl text-xs font-bold text-coffee-950 placeholder:text-coffee-300 focus:ring-4 focus:ring-coffee-500/10 outline-none transition-all"
          />
        </div>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isExpanded ? 'bg-coffee-950 text-white shadow-lg' : 'bg-coffee-50 text-coffee-600 hover:bg-coffee-100'}`}
        >
          <BiFilterAlt className="text-lg" />
          {isExpanded ? 'Hide Filters' : 'Advanced'}
        </button>

        {(query || Object.keys(activeFilters).length > 0) && (
          <button 
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
          >
            Clear All
          </button>
        )}
      </div>

      <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[600px] opacity-100 border-t border-coffee-50' : 'max-h-0 opacity-0'}`}>
        <div className="px-8 pb-8 pt-6 animate-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            
            {/* Status Section */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-coffee-300 mb-4 flex items-center gap-2">
                <BiCheckCircle className="text-coffee-400" /> Status Lifecycle
              </p>
              <div className="flex flex-wrap gap-2">
                {['pending', 'assigned', 'in_transit', 'delivered', 'delivery_failed'].map((s, idx) => (
                  <button 
                    key={s}
                    onClick={() => toggleFilter('status', s)}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border animate-in fade-in slide-in-from-left-2 ${
                      activeFilters.status === s 
                        ? 'bg-coffee-950 text-white border-coffee-950 shadow-lg scale-105' 
                        : 'bg-white text-coffee-500 border-coffee-100 hover:border-coffee-400 hover:bg-coffee-50/50'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Constraints Section */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-coffee-300 mb-4 flex items-center gap-2">
                <BiErrorCircle className="text-coffee-400" /> Special Constraints
              </p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => toggleFilter('requires_refrigeration', 'true')}
                  className={`group relative px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border overflow-hidden ${
                    activeFilters.requires_refrigeration === 'true'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                      : 'bg-white text-blue-500 border-blue-100 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {activeFilters.requires_refrigeration === 'true' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                    Cold Chain Only
                  </span>
                </button>
              </div>
            </div>

            {/* Timeframe Section */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-coffee-300 mb-4 flex items-center gap-2">
                <BiTimeFive className="text-coffee-400" /> Operational Window
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-coffee-300 uppercase ml-1">From</span>
                  <input 
                    type="date" 
                    className="w-full bg-coffee-50 border-none rounded-xl p-3 text-[10px] font-bold text-coffee-900 outline-none focus:ring-2 focus:ring-coffee-200 transition-all"
                    onChange={(e) => toggleFilter('date_from', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-coffee-300 uppercase ml-1">To</span>
                  <input 
                    type="date" 
                    className="w-full bg-coffee-50 border-none rounded-xl p-3 text-[10px] font-bold text-coffee-900 outline-none focus:ring-2 focus:ring-coffee-200 transition-all"
                    onChange={(e) => toggleFilter('date_to', e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
