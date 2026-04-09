import React, { useState, useEffect } from 'react';
import { BiSearch, BiFilterAlt, BiX, BiTimeFive, BiCheckCircle, BiErrorCircle } from 'react-icons/bi';

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
  }, [query, activeFilters]);

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
    <div className="bg-white rounded-[32px] border border-coffee-100 shadow-sm overflow-hidden transition-all duration-500">
      <div className="p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-300 text-lg" />
          <input 
            type="text" 
            placeholder={`Search ${entityType}... (e.g. "Cold Chain", "WH-001", "delivered")`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-3 bg-coffee-50/50 border-none rounded-2xl text-xs font-bold text-coffee-950 placeholder:text-coffee-300 focus:ring-2 focus:ring-coffee-100 outline-none transition-all"
          />
        </div>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-3 rounded-2xl transition-all ${isExpanded ? 'bg-coffee-950 text-white' : 'bg-coffee-50 text-coffee-600 hover:bg-coffee-100'}`}
        >
          <BiFilterAlt className="text-xl" />
        </button>

        {(query || Object.keys(activeFilters).length > 0) && (
          <button 
            onClick={clearFilters}
            className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-coffee-50 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Status Section */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-coffee-300 mb-3 flex items-center gap-2">
                <BiCheckCircle /> Status Profile
              </p>
              <div className="flex flex-wrap gap-2">
                {['pending', 'assigned', 'in_transit', 'delivered', 'delivery_failed'].map(s => (
                  <button 
                    key={s}
                    onClick={() => toggleFilter('status', s)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                      activeFilters.status === s 
                        ? 'bg-coffee-950 text-white border-coffee-950 shadow-md scale-105' 
                        : 'bg-white text-coffee-500 border-coffee-100 hover:border-coffee-300'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Constraints Section */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-coffee-300 mb-3 flex items-center gap-2">
                <BiErrorCircle /> Constraints
              </p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => toggleFilter('requires_refrigeration', 'true')}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                    activeFilters.requires_refrigeration === 'true'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                      : 'bg-white text-blue-500 border-blue-100 hover:border-blue-300'
                  }`}
                >
                  Cold Chain Only
                </button>
              </div>
            </div>

            {/* Timeframe Section */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-coffee-300 mb-3 flex items-center gap-2">
                <BiTimeFive /> Timeframe
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  className="bg-coffee-50 border-none rounded-xl p-2 text-[10px] font-bold text-coffee-900 outline-none"
                  onChange={(e) => toggleFilter('date_from', e.target.value)}
                />
                <input 
                  type="date" 
                  className="bg-coffee-50 border-none rounded-xl p-2 text-[10px] font-bold text-coffee-900 outline-none"
                  onChange={(e) => toggleFilter('date_to', e.target.value)}
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
