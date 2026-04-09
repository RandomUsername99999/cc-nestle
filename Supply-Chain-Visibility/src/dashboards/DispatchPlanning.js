import React, { useState, useEffect } from 'react';
import api from '../api';
import { BiBox, BiCheckCircle, BiErrorCircle, BiPointer, BiRefresh, BiUser, BiSearch, BiPackage, BiBadgeCheck, BiInfoCircle, BiChevronRight } from 'react-icons/bi';
import { GiTruck, GiWeight, GiResize, GiGears } from 'react-icons/gi';
import { HiOutlineCube, HiOutlineTruck, HiOutlineAdjustmentsHorizontal, HiOutlineMap, HiOutlineSquaresPlus } from 'react-icons/hi2';
import { HiOutlineExclamation, HiOutlineSun } from 'react-icons/hi';
import { LuPackageSearch, LuRadar } from 'react-icons/lu';
import toast from 'react-hot-toast';
import FilterPanel from '../components/FilterPanel';

export default function DispatchPlanning() {
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [warehouses, setWarehouses] = useState({});
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fillSuggestions, setFillSuggestions] = useState([]);
  const [showFillModal, setShowFillModal] = useState(false);
  const [activeClusterId, setActiveClusterId] = useState(null);
  const [clusterMap, setClusterMap] = useState({});
  const [vSearchQuery, setVSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (params = {}) => {
    setLoading(true);
    try {
      const hasQueryParams = params.q || params.status || params.requires_refrigeration;
      const orderEndpoint = hasQueryParams ? 'search/deliveries/' : 'orders/';
      
      const [orderRes, vehicleRes, clusterRes] = await Promise.all([
        api.get(orderEndpoint, { params }),
        api.get('vehicles/'),
        api.get('dispatch/recommendations/')
      ]);
      
      setOrders(hasQueryParams ? orderRes.data.results : orderRes.data);
      setVehicles(vehicleRes.data.filter(v => v.status !== 'maintenance'));
      
      const mapping = {};
      Object.values(clusterRes.data.warehouses || {}).forEach(wh => {
        Object.entries(wh.clusters).forEach(([cid, cluster]) => {
          cluster.orders.forEach(o => {
            mapping[o.order_id] = { cid, metrics: cluster.metrics };
          });
        });
      });
      setClusterMap(mapping);
      setWarehouses(clusterRes.data.warehouses || {});
    } catch (err) {
      toast.error("Failed to load dispatch data");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderToggle = (orderId) => {
    setSelectedOrders(prev => {
      const isRemoving = prev.includes(orderId);
      const next = isRemoving ? prev.filter(id => id !== orderId) : [...prev, orderId];
      
      if (next.length === 1) {
        const cid = clusterMap[next[0]]?.cid;
        if (cid) {
            setActiveClusterId(cid);
            toast.success("Intelligence: Cluster context activated. Recommended tasks highlighted.");
        }
      } else if (next.length === 0) {
        setActiveClusterId(null);
      }
      return next;
    });
  };

  const calculateTotalLoad = () => {
    const selected = orders.filter(o => selectedOrders.includes(o.order_id));
    const totalWeight = selected.reduce((sum, o) => sum + parseFloat(o.weight_kg), 0);
    const totalVolume = selected.reduce((sum, o) => sum + parseFloat(o.volume_m3 || 0), 0);
    return { totalWeight, totalVolume };
  };

  const { totalWeight, totalVolume } = calculateTotalLoad();
  
  const weightPercent = selectedVehicle && selectedVehicle.capacity_kg ? Math.min(100, (totalWeight / parseFloat(selectedVehicle.capacity_kg)) * 100) : 0;
  const volumePercent = selectedVehicle && selectedVehicle.capacity_volume ? Math.min(100, (totalVolume / parseFloat(selectedVehicle.capacity_volume)) * 100) : 0;

  const fetchFillSuggestions = async (vId, cId) => {
    try {
      const resp = await api.get(`vehicles/${vId}/capacity_fill_suggestions/?cluster_id=${cId}`);
      setFillSuggestions(resp.data);
      if (resp.data.length > 0) setShowFillModal(true);
      else toast.success("Current manifest is already highly optimized.");
    } catch (err) {
      toast.error("Failed to fetch suggestions");
    }
  };

  const addSuggestionToManifest = (order) => {
    if (!selectedOrders.includes(order.id)) {
        setSelectedOrders(prev => [...prev, order.id]);
        toast.success(`Success: Integrated Order #${order.id} into Manifest Axis.`);
    }
    setShowFillModal(false);
  };

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
  const selectedOrderObjects = orders.filter(o => selectedOrders.includes(o.order_id));
  const requiresRefrigeration = selectedOrderObjects.some(o => o.requires_refrigeration);
  const isVehicleIncompatible = requiresRefrigeration && selectedVehicleData && !selectedVehicleData.is_refrigerated;

  const handleAssign = async () => {
    if (!selectedVehicle) {
      toast.error("Asset selection required for deployment.");
      return;
    }
    if (isVehicleIncompatible) {
      toast.error("Cold Chain Violation: Selected vehicle is not refrigerated.");
      return;
    }

    if (!selectedVehicleData.assignedDriver) {
      toast.error("Selected vehicle has no active driver assignment.");
      return;
    }

    setLoading(true);
    try {
      await api.post('shipments/deploy_manifest/', {
        order_ids: selectedOrders,
        vehicle_id: selectedVehicleData.id,
        driver_id: selectedVehicleData.assignedDriver
      });
      toast.success(`Success: Manifest deployed to unit ${selectedVehicleData.plate_number}`);
      setSelectedOrders([]);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Execution Bridge Failure: Deployment Aborted");
    } finally {
      setLoading(false);
    }
  };

  // Helper for circular progress
  const CircularProgress = ({ percent, label, color = "stroke-coffee-950" }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-coffee-50"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="transparent"
              className={`${color} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black text-coffee-950">{Math.round(percent)}%</span>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase text-coffee-400 tracking-wider">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] pb-20 max-w-[1600px] mx-auto px-4 sm:px-12 animate-fade-in font-sans">
      
      {/* Premium Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-12">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-coffee-950 rounded-full"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-coffee-400">Enterprise Intelligence</span>
          </div>
          <h1 className="text-5xl font-black text-coffee-950 tracking-tighter mb-2">Dispatch Planning</h1>
          <p className="text-coffee-400 font-medium text-sm max-w-lg leading-relaxed">
            High-velocity manifest orchestration: Select assets, bundle tasks, and deploy clusters.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            className="bg-white hover:bg-coffee-50 text-coffee-900 border border-coffee-100 px-8 py-4 rounded-full shadow-sm text-xs font-black uppercase tracking-widest transition-all flex items-center group gap-3"
          >
            <BiRefresh className={`text-xl ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} /> Sync
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_380px] gap-8 items-start">
        
        {/* LEFT COLUMN: Fleet Inventory */}
        <section className="flex flex-col gap-6">
            {isVehicleIncompatible && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-bounce">
              <HiOutlineExclamation className="text-rose-500 text-xl shrink-0 mt-0.5" />
              <div>
                <p className="text-rose-600 font-black text-[11px] uppercase tracking-wider">Cold Chain Violation</p>
                <p className="text-rose-500/80 text-[10px] font-bold leading-relaxed mt-1">You have selected refrigerated items but current asset lacks cooling capabilities.</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-coffee-400 uppercase tracking-widest text-[10px] font-black">
              <HiOutlineTruck className="text-lg" /> Fleet Inventory {vSearchQuery && <span className="text-coffee-300 font-medium lowercase">(filtered)</span>}
            </div>
            <span className="text-[10px] font-black text-coffee-600 bg-coffee-100/50 px-3 py-1 rounded-full">{vehicles.length} Units</span>
          </div>

          <div className="relative mx-1">
            <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-300 text-lg" />
            <input 
              type="text" 
              placeholder="Filter Fleet (Plate, Driver, Vol...)"
              value={vSearchQuery}
              onChange={(e) => setVSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-coffee-100 rounded-[24px] text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-coffee-100 outline-none transition-all shadow-sm"
            />
          </div>
          
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            {vehicles.filter(v => {
              if(!vSearchQuery) return true;
              const q = vSearchQuery.toLowerCase();
              const isColdKeyword = ["refrigerated", "fridge", "cold", "refrig"].some(kw => kw.includes(q));
              
              return v.plate_number.toLowerCase().includes(q) || 
                     (v.manufacturer || "").toLowerCase().includes(q) || 
                     (v.make_model || "").toLowerCase().includes(q) ||
                     (v.driver_name || "").toLowerCase().includes(q) ||
                     (v.capacity_volume?.toString() || "").includes(q) ||
                     (isColdKeyword && v.is_refrigerated);
            }).map(v => {
              const isCompatible = !requiresRefrigeration || v.is_refrigerated;
              
              return (
                <div 
                  key={v.id}
                  onClick={() => setSelectedVehicle(v.id)}
                  className={`p-6 rounded-[32px] border-2 transition-all cursor-pointer relative overflow-hidden ${
                    selectedVehicle === v.id 
                      ? 'border-[#3E2723] bg-white shadow-xl scale-[1.02]' 
                      : !isCompatible 
                        ? 'border-rose-100 bg-rose-50/30 opacity-60 grayscale-[0.5]' 
                        : 'border-coffee-50 bg-white hover:border-coffee-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${selectedVehicle === v.id ? 'bg-[#3E2723] text-white' : 'bg-coffee-50 text-coffee-600'}`}>
                        <HiOutlineTruck className="text-xl" />
                      </div>
                      <div>
                        <h4 className="font-black text-coffee-950 text-xs tracking-wider">{v.plate_number}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] font-bold text-coffee-400 uppercase">{v.manufacturer} {v.make_model}</p>
                          {v.is_refrigerated && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 text-[8px] font-black uppercase ring-1 ring-blue-100">
                                <HiOutlineSun className="text-[10px] rotate-180" /> Cold Chain Eq.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedVehicle === v.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    )}
                    {!isCompatible && (
                        <div className="flex items-center gap-1 text-rose-500 text-[8px] font-black uppercase">
                            <HiOutlineExclamation className="text-sm" /> Incompatible
                        </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase mb-1.5 px-0.5">
                        <span className="text-coffee-400">Capacity: {v.capacity_kg} kg</span>
                        <span className="text-coffee-900">Wt: {v.capacity_kg - 400}kg</span>
                      </div>
                      <div className="h-1.5 bg-coffee-50 rounded-full overflow-hidden">
                        <div className="h-full bg-coffee-950 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase mb-1.5 px-0.5">
                        <span className="text-coffee-400">45 m³</span>
                        <span className="text-coffee-900">41m³</span>
                      </div>
                      <div className="h-1.5 bg-coffee-100 rounded-full overflow-hidden">
                        <div className="h-full bg-coffee-400 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CENTER COLUMN: Task Pool */}
        <section className="bg-white rounded-[48px] shadow-sm border border-coffee-50/50 flex flex-col min-h-[850px] overflow-hidden">
          <div className="p-10 flex flex-col gap-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-coffee-950 tracking-tighter">Pending Task Pool</h2>
                <p className="text-sm font-medium text-coffee-400 mt-1 pb-4">Select orders to populate the active manifest logic.</p>
                <FilterPanel onFilter={fetchData} entityType="orders" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-coffee-300 text-[10px] font-black uppercase tracking-[0.2em] border-b border-coffee-50">
                    <th className="pb-6 w-12"><input type="checkbox" className="rounded-md border-coffee-200" /></th>
                    <th className="pb-6">Order ID</th>
                    <th className="pb-6">Destination</th>
                    <th className="pb-6 text-center">Weight(kg)</th>
                    <th className="pb-6 text-center">Volume(m³)</th>
                    <th className="pb-6 text-center">Priority</th>
                    <th className="pb-6 text-right">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-50/50">
                  {orders.filter(o => {
                    const isPending = o.status === 'pending';
                    if (!isPending) return false;
                    return true;
                  }).map(o => {
                    const orderCluster = clusterMap[o.order_id];
                    const isRecommended = activeClusterId && orderCluster?.cid === activeClusterId && !selectedOrders.includes(o.order_id);
                    const isSelected = selectedOrders.includes(o.order_id);

                    return (
                      <tr 
                        key={o.order_id} 
                        onClick={() => handleOrderToggle(o.order_id)}
                        className={`group transition-all cursor-pointer ${isSelected ? 'bg-coffee-50/30' : 'hover:bg-[#F8F7F4]/50'} ${isRecommended ? 'bg-emerald-50/40' : ''}`}
                      >
                        <td className="py-6 px-1">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            readOnly
                            className="rounded-md border-coffee-200 text-coffee-900 focus:ring-coffee-900"
                          />
                        </td>
                        <td className="py-6">
                          <span className="font-mono font-black text-coffee-950 text-xs">#{o.order_id}</span>
                        </td>
                        <td className="px-4 py-4 max-w-[150px]">
                        <p className="text-[11px] font-bold text-coffee-900 truncate">{o.delivery_address}</p>
                        {o.requires_refrigeration && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-tighter ring-1 ring-blue-100 mt-1">
                                <HiOutlineSun className="rotate-180" /> Cold Chain
                            </span>
                        )}
                      </td>
                        <td className="py-6 text-center">
                          <span className={`text-xs font-black ${isSelected ? 'text-coffee-950' : 'text-coffee-400'}`}>{o.weight_kg}</span>
                        </td>
                        <td className="py-6 text-center">
                          <span className={`text-xs font-bold ${isSelected ? 'text-coffee-950' : 'text-coffee-300'}`}>{o.volume_m3 || '4.8'}</span>
                        </td>
                        <td className="py-6 text-center">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${Math.random() > 0.5 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>High</span>
                        </td>
                        <td className="py-6 text-right">
                          <span className="text-xs font-bold text-coffee-400 italic">05, Apr</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-auto p-10 bg-[#F8F7F4]/50 border-t border-coffee-50 flex justify-between items-center">
            <button className="flex items-center gap-3 text-coffee-900 font-black uppercase tracking-widest text-[10px] hover:translate-x-1 transition-transform">
              <HiOutlineAdjustmentsHorizontal className="text-lg" /> Filter Results
            </button>
            <div className="text-[10px] font-black text-coffee-300 uppercase italic flex items-center gap-4">
              Showing {orders.filter(o => o.status === 'pending').length} verified tasks
              {activeClusterId && <span className="text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full not-italic">sector optimization active</span>}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Manifest Summary */}
        <section className="sticky top-12 space-y-8">
          <div className="bg-white rounded-[48px] shadow-2xl shadow-coffee-200/20 border border-coffee-100/50 p-10 flex flex-col gap-10">
            <h2 className="text-sm font-black text-coffee-950 uppercase tracking-[0.2em]">Manifest Summary</h2>
            
            <div className="bg-[#F8F7F4] p-8 rounded-[32px] flex items-center justify-between group h-28 border border-transparent hover:border-coffee-100 transition-all">
              <div>
                <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-1.5">Assigned Vehicle</p>
                <h3 className="text-2xl font-black text-coffee-950 tracking-tighter">
                  {selectedVehicleData ? selectedVehicleData.plate_number : "Assign Asset"}
                </h3>
              </div>
              <GiTruck className={`text-4xl ${selectedVehicle ? 'text-coffee-950' : 'text-coffee-100'}`} />
            </div>

            <div className="flex justify-around items-center py-4">
              <CircularProgress percent={weightPercent} label="Weight Payload" color={weightPercent > 100 ? 'text-rose-500' : 'text-coffee-950'} />
              <CircularProgress percent={volumePercent} label="Volumetric Capacity" color={volumePercent > 100 ? 'text-rose-400' : 'text-coffee-500'} />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-coffee-50 pb-4">
                <h4 className="text-[10px] font-black text-coffee-950 uppercase tracking-widest">Load Planner for {selectedVehicle?.plate_number || 'Unit'}</h4>
              </div>
              
              <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {selectedOrders.length > 0 ? (
                  orders.filter(o => selectedOrders.includes(o.order_id)).map(o => (
                    <div key={o.order_id} className="flex items-center justify-between p-4 bg-coffee-50/50 rounded-2xl group hover:bg-coffee-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <BiPackage className="text-coffee-300" />
                        <span className="font-mono font-black text-xs text-coffee-950">#{o.order_id}</span>
                      </div>
                      <BiUser className="text-coffee-200 group-hover:text-coffee-400" />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center py-10 opacity-30">
                    <BiBox className="text-4xl mb-4" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No orders selected</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
                {(weightPercent > 100 || volumePercent > 100) && (
                  <div className="bg-rose-50 border border-rose-100 p-6 rounded-[24px] flex items-start gap-4 animate-bounce-subtle">
                    <BiErrorCircle className="text-2xl text-rose-500 shrink-0" />
                    <div>
                      <h5 className="text-[11px] font-black text-rose-900 uppercase mb-1">Alerts: Load Exceeds Capacity</h5>
                      <p className="text-[9px] font-bold text-rose-700 leading-normal uppercase italic">Total orders: {selectedOrders.length} • Critical threshold reached</p>
                    </div>
                  </div>
                )}

                {selectedOrders.length > 0 && weightPercent <= 100 && volumePercent <= 100 && (
                  <div className="bg-amber-50 border border-amber-100 p-5 rounded-[24px] flex items-center justify-center gap-3">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest italic">Optimal Load Reached!</span>
                  </div>
                )}

                <button 
                  onClick={handleAssign}
                  disabled={!selectedVehicle || selectedOrders.length === 0 || weightPercent > 100 || volumePercent > 100}
                  className={`w-full py-6 rounded-[32px] font-black uppercase tracking-widest text-[11px] transition-all shadow-xl active:scale-95 ${!selectedVehicle || selectedOrders.length === 0 || weightPercent > 100 || volumePercent > 100 ? 'bg-coffee-50 text-coffee-200 cursor-not-allowed shadow-none' : 'bg-[#D6D3D1] text-coffee-900 hover:bg-coffee-950 hover:text-white'}`}
                >
                  Deploy Manifest
                </button>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-coffee-50 p-8 flex flex-col gap-5">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-coffee-300 uppercase tracking-widest">Live Efficiency</span>
                <span className="text-xs font-black text-emerald-600">Active</span>
             </div>
             <div className="flex gap-2">
                <div className="h-2 bg-rose-400 rounded-full w-24"></div>
                <div className="h-2 bg-emerald-500 rounded-full flex-1"></div>
                <div className="h-2 bg-amber-400 rounded-full w-12"></div>
                <div className="h-2 bg-coffee-50 rounded-full w-12"></div>
             </div>
          </div>
        </section>
      </div>

      {/* Geospatial Section */}
      <div className="mt-12 bg-white rounded-[56px] p-12 shadow-sm border border-coffee-50 relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row items-center justify-between relative z-10">
            <div className="flex items-center gap-6">
              <div className="p-5 rounded-[32px] bg-coffee-950 text-emerald-400 text-3xl">
                <LuRadar className="animate-pulse" />
              </div>
              <div>
                 <h2 className="text-3xl font-black text-coffee-950 tracking-tighter">Geospatial Clustering</h2>
                 <p className="text-coffee-400 mt-1 font-medium text-sm italic">AI-driven density grouping partitioned by warehouse origin.</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-[500px] h-full bg-[#F8F7F4]/50 -skew-x-12 translate-x-32 group-hover:translate-x-20 transition-transform duration-1000"></div>
      </div>

      {/* Suggestion Modal (Retained logic but updated for new UI consistency) */}
      {showFillModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-coffee-950/40 backdrop-blur-sm" onClick={() => setShowFillModal(false)}></div>
          <div className="bg-white rounded-[48px] w-full max-w-2xl relative z-10 p-12 overflow-hidden shadow-2xl border border-coffee-100">
            <div className="flex items-center gap-4 mb-4">
               <span className="bg-emerald-500 text-white p-3 rounded-2xl text-2xl"><LuRadar /></span>
               <h3 className="text-3xl font-black text-coffee-950 tracking-tighter">AI Capacity Boost</h3>
            </div>
            <p className="text-coffee-400 font-medium mb-10 leading-relaxed text-sm">Cluster optimization identifies high-density candidates that fit your current route and remaining unit volume.</p>
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                {fillSuggestions.map(order => (
                  <div key={order.id} className="p-6 rounded-[32px] bg-[#F8F7F4]/70 border border-coffee-50 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                    <div>
                      <p className="font-black text-coffee-950 text-lg tracking-tight font-mono">#{order.id}</p>
                      <p className="text-[10px] text-coffee-400 font-bold uppercase tracking-wider">{order.address}</p>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-coffee-300 uppercase tracking-widest">Payload</p>
                        <p className="text-sm font-black text-coffee-900">{order.weight}kg</p>
                      </div>
                      <button onClick={() => addSuggestionToManifest(order)} className="bg-coffee-950 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Integrate</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 3s infinite ease-in-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E7E5E4; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D6D3D1; }
      `}} />
    </div>
  );
}
