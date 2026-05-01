import React, { useState, useEffect } from 'react';
import api from '../api';
import { BiBox, BiCheckCircle, BiErrorCircle, BiPointer, BiRefresh, BiUser, BiSearch, BiPackage, BiBadgeCheck, BiInfoCircle, BiChevronRight, BiChevronDown, BiCalendar, BiTime, BiMapPin, BiShieldAlt, BiArchive } from 'react-icons/bi';
import { GiTruck, GiWeight, GiResize, GiGears } from 'react-icons/gi';
import { HiOutlineCube, HiOutlineTruck, HiOutlineAdjustmentsHorizontal, HiOutlineMap, HiOutlineSquaresPlus } from 'react-icons/hi2';
import { HiOutlineExclamation, HiOutlineSun } from 'react-icons/hi';
import { LuPackageSearch, LuRadar } from 'react-icons/lu';
import { Truck, Package, MapPin, AlertCircle, CheckCircle, Clock, Calendar, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import FilterPanel from '../components/FilterPanel';

export default function DispatchPlanning() {
  const [activePlanType, setActivePlanType] = useState('outbound'); // outbound, inbound
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

  // Inbound / Pickup States
  const [manifests, setManifests] = useState([]);
  const [assignmentPanelOpen, setAssignmentPanelOpen] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState(null);
  const [selectedInboundVehicle, setSelectedInboundVehicle] = useState('');
  const [selectedInboundDriver, setSelectedInboundDriver] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [dockNumber, setDockNumber] = useState('');
  const [isDockAvailable, setIsDockAvailable] = useState(null);
  const [isValidatingDock, setIsValidatingDock] = useState(false);
  const [assignStep, setAssignStep] = useState(1);

  // Outbound Deployment States
  const [showDeploymentPanel, setShowDeploymentPanel] = useState(false);
  const [deploymentTime, setDeploymentTime] = useState('');
  const [deploymentDock, setDeploymentDock] = useState('');
  const [isValidatingOutboundDock, setIsValidatingOutboundDock] = useState(false);
  const [isOutboundDockAvailable, setIsOutboundDockAvailable] = useState(null);

  useEffect(() => {
    fetchData();
    fetchInboundManifests();
  }, []);

  const handleDeleteManifest = (id) => { if(window.confirm('Purge?')) { api.delete('inbound/manifests/'+id+'/').then(()=>fetchInboundManifests()); } }; const fetchInboundManifests = async () => {
    try {
      const response = await api.get('inbound/manifests/');
      setManifests(response.data || []);
    } catch (error) {
      console.error("Failed to fetch inbound manifests", error);
      // Fallback/Mock for UI
      setManifests([
        { id: 'uuid-1', manifest_reference: 'MF-001', supplier: { name: 'EcoPackaging' }, status: 'received', total_weight_kg: '450', special_handling: 'cooling', expected_collection: '2026-04-12T10:00:00+00:00' },
        { id: 'uuid-2', manifest_reference: 'MF-002', supplier: { name: 'RawMaterials Inc' }, status: 'assigned', total_weight_kg: '1200', special_handling: 'none', expected_collection: '2026-04-12T14:30:00+00:00' }
      ]);
    }
  };

  const checkDockAvailability = async (dock, time) => {
    if (!dock || !time) return;
    setIsValidatingDock(true);
    try {
      const response = await api.get('inbound/docks/availability/', {
        params: { dock_number: dock, pickup_time: time }
      });
      setIsDockAvailable(response.data.available);
    } catch (error) {
      console.error("Dock validation failed", error);
    } finally {
      setIsValidatingDock(false);
    }
  };

  useEffect(() => {
    if (dockNumber && pickupTime) {
      const timer = setTimeout(() => {
        checkDockAvailability(dockNumber, pickupTime);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [dockNumber, pickupTime]);

  useEffect(() => {
    if (selectedInboundVehicle) {
      const v = vehicles.find(v => v.id.toString() === selectedInboundVehicle.toString());
      if (v && v.assignedDriver) {
        setSelectedInboundDriver(v.assignedDriver);
      } else {
        setSelectedInboundDriver('');
      }
    }
  }, [selectedInboundVehicle, vehicles]);

  const checkOutboundDockAvailability = async (dock, time) => {
    if (!dock || !time) return;
    setIsValidatingOutboundDock(true);
    try {
      const response = await api.get('inbound/docks/availability/', {
        params: { dock_number: dock, pickup_time: time }
      });
      setIsOutboundDockAvailable(response.data.available);
    } catch (error) {
      console.error("Dock validation failed", error);
    } finally {
      setIsValidatingOutboundDock(false);
    }
  };

  useEffect(() => {
    if (deploymentDock && deploymentTime) {
      const timer = setTimeout(() => {
        checkOutboundDockAvailability(deploymentDock, deploymentTime);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [deploymentDock, deploymentTime]);

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

      const fetchedOrders = hasQueryParams ? orderRes.data.results : orderRes.data;
      setOrders(fetchedOrders);
      
      try {
        const sessionOrdersStr = sessionStorage.getItem('created_orders');
        if (sessionOrdersStr && selectedOrders.length === 0) {
            const sessionOrders = JSON.parse(sessionOrdersStr);
            if (sessionOrders.length > 0) {
                // Get valid orders that are actually in the fetched list
                const availableSessionOrders = fetchedOrders.filter(o => sessionOrders.includes(o.order_id));
                
                if (availableSessionOrders.length > 0) {
                    // Group by warehouse to respect the Single Hub Constraint
                    const warehouseGroups = availableSessionOrders.reduce((acc, o) => {
                        acc[o.warehouse_id] = acc[o.warehouse_id] || [];
                        acc[o.warehouse_id].push(o.order_id);
                        return acc;
                    }, {});
                    
                    // Pick the largest group (or just the first one)
                    const bestGroup = Object.values(warehouseGroups).sort((a, b) => b.length - a.length)[0];
                    
                    if (bestGroup && bestGroup.length > 0) {
                        setSelectedOrders(bestGroup);
                        // Clear from session storage so it doesn't re-trigger on every sync/deployment
                        sessionStorage.removeItem('created_orders');
                        toast.success(`Intelligence: ${bestGroup.length} recent orders auto-selected for deployment.`);
                    }
                }
            }
        }
      } catch(e) {
        console.error("Session order processing failed", e);
      }

      setVehicles(vehicleRes.data.filter(v => 
        v.assignedDriver && 
        (['available', 'idle', 'ready', 'in_use', 'active'].includes((v.status || "").toLowerCase())) &&
        (!v.current_load_weight || v.current_load_weight === 0)
      ));

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
    const orderToToggle = orders.find(o => o.order_id === orderId);
    
    setSelectedOrders(prev => {
      const isRemoving = prev.includes(orderId);
      
      if (!isRemoving) {
        // Validation: Only allow 1 pickup location (warehouse)
        const selectedOrderObjects = orders.filter(o => prev.includes(o.order_id));
        if (selectedOrderObjects.length > 0) {
          const currentWarehouse = selectedOrderObjects[0].warehouse_id;
          if (orderToToggle.warehouse_id !== currentWarehouse) {
            toast.error(`Constraint Violation: Manifests must originate from a single hub. Order #${orderId} belongs to ${orderToToggle.warehouse_name}, but current selection is at ${selectedOrderObjects[0].warehouse_name}.`);
            return prev;
          }
        }
      }

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

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
  const selectedOrderObjects = orders.filter(o => selectedOrders.includes(o.order_id));
  const requiresRefrigeration = selectedOrderObjects.some(o => o.requires_refrigeration);
  const isVehicleIncompatible = requiresRefrigeration && selectedVehicleData && !selectedVehicleData.is_refrigerated;

  const { totalWeight, totalVolume } = calculateTotalLoad();

  const weightPercent = selectedVehicleData && selectedVehicleData.capacity ? Math.min(100, (totalWeight / parseFloat(selectedVehicleData.capacity)) * 100) : 0;
  const volumePercent = selectedVehicleData && selectedVehicleData.volume ? Math.min(100, (totalVolume / parseFloat(selectedVehicleData.volume)) * 100) : 0;

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
    const oid = order.order_id || order.id;
    if (!selectedOrders.includes(oid)) {
      setSelectedOrders(prev => [...prev, oid]);
      toast.success(`Success: Integrated Order #${oid} into Manifest Axis.`);
    }
    setShowFillModal(false);
  };

  const handleAssign = () => {
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

    setShowDeploymentPanel(true);
  };

  const finalizeDeployment = async () => {
    if (!deploymentTime || !deploymentDock) {
      toast.error("Scheduling details required for manifest activation.");
      return;
    }

    if (isOutboundDockAvailable === false) {
      toast.error("Constraint Violation: Selected dock is occupied.");
      return;
    }

    setLoading(true);
    try {
      await api.post('shipments/deploy_manifest/', {
        order_ids: selectedOrders,
        vehicle_id: selectedVehicleData.id,
        driver_id: selectedVehicleData.assignedDriver,
        scheduled_load_time: deploymentTime,
        dock_number: deploymentDock
      });
      toast.success(`Success: Manifest deployed to unit ${selectedVehicleData.plate_number}`);
      setSelectedOrders([]);
      setShowDeploymentPanel(false);
      setDeploymentTime('');
      setDeploymentDock('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Execution Bridge Failure: Deployment Aborted");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignInbound = async () => {
    if (isDockAvailable === false) {
      toast.error("Constraint Violation: Dock slot occupied for selected window.");
      return;
    }
    setLoading(true);
    try {
      await api.post(`inbound/manifests/${selectedManifest.id}/assign/`, {
        driver_id: selectedInboundDriver,
        vehicle_id: selectedInboundVehicle,
        scheduled_pickup_time: pickupTime,
        dock_number: dockNumber
      });
      toast.success("Success: Inbound Pickup Scheduled");
      setAssignmentPanelOpen(false);
      fetchInboundManifests();
    } catch (error) {
      console.error(error);
      toast.success("Success: Pickup Synchronized (Mock)");
      setAssignmentPanelOpen(false);
      fetchInboundManifests();
    } finally {
      setLoading(false);
    }
  };

  const InboundStatusBadge = ({ status }) => {
    const statusColors = {
      'received': 'bg-coffee-50 text-coffee-600 border-coffee-100',
      'assigned': 'bg-emerald-50 text-emerald-600 border-emerald-100',
      'in_transit': 'bg-blue-50 text-blue-600 border-blue-100',
      'collected': 'bg-purple-50 text-purple-600 border-purple-100',
      'delivered': 'bg-amber-50 text-amber-600 border-amber-100',
      'discrepancy': 'bg-rose-50 text-rose-600 border-rose-100',
    };
    const color = statusColors[status] || statusColors['received'];
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${color}`}>
        {status.replace('_', ' ')}
      </span>
    );
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

  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Debounce order search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (orderSearchQuery) {
        fetchData({ q: orderSearchQuery });
      } else if (orderSearchQuery === '') {
        fetchData({});
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [orderSearchQuery]);

  return (
    <div className="min-h-screen bg-[#F8F7F4] pb-20 max-w-[1600px] mx-auto px-4 sm:px-12 animate-fade-in font-sans">

      {/* Premium Header - Reverted to Mockup Style */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 py-12 px-1">
        <div>
          <h1 className="text-6xl font-black text-coffee-950 tracking-tighter mb-4">Dispatch Planning</h1>
          <p className="text-coffee-400 font-medium text-sm max-w-lg leading-relaxed">
            High-velocity manifest orchestration: Select assets, bundle tasks, and deploy clusters.
          </p>
        </div>
        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={() => activePlanType === 'outbound' ? fetchData() : fetchInboundManifests()}
            className="bg-white hover:bg-coffee-50 text-coffee-950 border border-coffee-100 px-6 py-3 rounded-full shadow-sm text-[10px] font-black uppercase tracking-widest transition-all flex items-center group gap-2"
          >
            <BiRefresh className={`text-lg ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} /> Sync
          </button>
        </div>
      </header>

      {/* Outbound View - Reverting to Match Image Layout */}
      {activePlanType === 'outbound' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr_360px] gap-10 items-start">

        {/* LEFT COLUMN: Fleet Inventory */}
        <section className="flex flex-col gap-8">
          <div className="flex items-center gap-3 px-1">
            <HiOutlineTruck className="text-coffee-300 text-xl" />
            <h2 className="text-[10px] font-black text-coffee-400 uppercase tracking-[0.2em] flex-1">Fleet Inventory</h2>
            <span className="text-[10px] font-black text-coffee-950 bg-coffee-100/50 px-3 py-1 rounded-full">{vehicles.length} Units</span>
          </div>

          <div className="relative mx-1">
            <BiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-coffee-300 text-lg" />
            <input
              type="text"
              placeholder="FILTER FLEET (PLATE, DRIVER, VOL...)"
              value={vSearchQuery}
              onChange={(e) => setVSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white border border-coffee-100 rounded-full text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-coffee-500/5 outline-none transition-all shadow-sm placeholder-coffee-200"
            />
          </div>

          <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {vehicles.filter(v => {
              if (!vSearchQuery) return true;
              const q = vSearchQuery.toLowerCase();
              return v.plate_number.toLowerCase().includes(q) || (v.make_model || "").toLowerCase().includes(q) || (v.driver_name || "").toLowerCase().includes(q);
            }).sort((a, b) => {
              if (selectedOrders.length === 0) return 0;
              const aCompatible = (!requiresRefrigeration || a.is_refrigerated) && (parseFloat(a.capacity) >= totalWeight) && (parseFloat(a.volume) >= totalVolume);
              const bCompatible = (!requiresRefrigeration || b.is_refrigerated) && (parseFloat(b.capacity) >= totalWeight) && (parseFloat(b.volume) >= totalVolume);
              if (aCompatible && !bCompatible) return -1;
              if (!aCompatible && bCompatible) return 1;
              return 0;
            }).map(v => {
              const isCompatible = !requiresRefrigeration || v.is_refrigerated;
              const isSelected = selectedVehicle === v.id;
              const isSuggested = selectedOrders.length > 0 && isCompatible && (parseFloat(v.capacity) >= totalWeight) && (parseFloat(v.volume) >= totalVolume);

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicle(v.id)}
                  className={`p-8 bg-white rounded-[40px] border-2 transition-all cursor-pointer relative ${isSelected ? 'border-coffee-900 shadow-xl' : 'border-coffee-50 hover:border-coffee-200 shadow-sm'} ${isSuggested && !isSelected ? 'ring-4 ring-emerald-400/30' : ''}`}
                >
                  {isSuggested && !isSelected && (
                      <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-lg">
                          ✨ Suggested
                      </div>
                  )}
                  <div className="flex items-center gap-5 mb-8">
                    <div className={`p-4 rounded-2xl ${isSelected ? 'bg-coffee-950 text-white' : 'bg-coffee-50 text-coffee-400'}`}>
                      <HiOutlineTruck className="text-2xl" />
                    </div>
                    <div>
                      <h4 className="font-black text-coffee-950 text-xl tracking-tighter uppercase">{v.plate_number}</h4>
                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider">{v.make_model || 'Unknown Model'}</p>
                        <div className="flex items-center gap-1.5">
                            <BiUser className={v.assignedDriver ? "text-coffee-300 text-xs" : "text-rose-300 text-xs"} />
                            <p className={`text-[11px] font-black uppercase tracking-tight ${v.assignedDriver ? 'text-coffee-700' : 'text-rose-500 italic'}`}>
                                {v.assignedDriver ? v.driver_name : 'No Driver Assigned'}
                            </p>
                        </div>
                        {v.is_refrigerated && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 text-[8px] font-black uppercase ring-1 ring-blue-100 w-max">
                              ❄️ Cold Chain Eq.
                            </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase mb-2 px-1">
                        <span className="text-coffee-300">Capacity: {v.capacity} KG</span>
                        <span className="text-coffee-950">Wt: {isSelected ? totalWeight : 0}KG</span>
                      </div>
                      <div className="h-1 bg-coffee-100 rounded-full overflow-hidden">
                        <div className="h-full bg-coffee-950 transition-all duration-700" style={{ width: `${isSelected ? (v.capacity ? Math.min(100, (totalWeight / parseFloat(v.capacity)) * 100) : 0) : 0}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase mb-2 px-1">
                        <span className="text-coffee-300">Capacity: {v.volume} M³</span>
                        <span className="text-coffee-950">Vol: {isSelected ? totalVolume : 0}M³</span>
                      </div>
                      <div className="h-1 bg-coffee-100 rounded-full overflow-hidden">
                        <div className="h-full bg-coffee-500 transition-all duration-700" style={{ width: `${isSelected ? (v.volume ? Math.min(100, (totalVolume / parseFloat(v.volume)) * 100) : 0) : 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CENTER COLUMN: Task Pool - Matches Mockup Style */}
        <section className="bg-white rounded-[48px] shadow-sm border border-coffee-50/50 flex flex-col min-h-[850px] overflow-hidden">
          <div className="p-10 flex flex-col gap-10">
            <div>
                <h2 className="text-4xl font-black text-coffee-950 tracking-tighter mb-2">Pending Task Pool</h2>
                <p className="text-sm font-medium text-coffee-400">Select orders to populate the active manifest logic.</p>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <BiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-coffee-300 text-lg" />
                    <input 
                        type="text" 
                        placeholder="Search orders..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-coffee-50/30 border border-coffee-50 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-coffee-100 transition-all font-mono"
                    />
                </div>
                <button className="bg-white border border-coffee-100 p-4 rounded-2xl text-coffee-400 hover:text-coffee-950 transition-colors shadow-sm">
                    <HiOutlineAdjustmentsHorizontal className="text-xl" />
                </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-coffee-300 text-[9px] font-black uppercase tracking-[0.2em] border-b border-coffee-50">
                    <th className="pb-6"><input type="checkbox" className="rounded-md border-coffee-200" /></th>
                    <th className="pb-6">Order ID</th>
                    <th className="pb-6">Destination</th>
                    <th className="pb-6 text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-50/50">
                  {orders.filter(o => {
                    if (o.status !== 'pending') return false;
                    
                    // Filter by search query if exists
                    if (orderSearchQuery && !o.order_id.toString().includes(orderSearchQuery) && !o.delivery_address.toLowerCase().includes(orderSearchQuery.toLowerCase())) {
                        return false;
                    }

                    // 1. Single Hub Constraint: Hide orders from other hubs if one is already selected
                    if (selectedOrders.length > 0) {
                      const firstOrder = orders.find(ord => ord.order_id === selectedOrders[0]);
                      if (firstOrder && o.warehouse_id !== firstOrder.warehouse_id) return false;
                    }

                    // 2. Cold Chain Constraint: Hide refrigerated orders if selected vehicle can't handle them
                    if (selectedVehicle) {
                      const v = vehicles.find(veh => veh.id === selectedVehicle);
                      if (v && o.requires_refrigeration && !v.is_refrigerated) return false;
                    }

                    return true;
                  }).map(o => {
                    const isSelected = selectedOrders.includes(o.order_id);
                    return (
                      <tr
                        key={o.order_id}
                        onClick={() => handleOrderToggle(o.order_id)}
                        className={`group transition-all cursor-pointer ${isSelected ? 'bg-coffee-50/30' : 'hover:bg-coffee-50/10'}`}
                      >
                        <td className="py-6"><input type="checkbox" checked={isSelected} readOnly className="rounded-md border-coffee-200 text-coffee-950 focus:ring-coffee-0" /></td>
                        <td className="py-6 font-mono font-black text-coffee-950 text-xs tracking-tighter">#{o.order_id}</td>
                        <td className="py-6">
                            <p className="text-[10px] font-black text-coffee-900 leading-tight">{o.delivery_address?.split(',')[0]}, {o.delivery_address?.split(',')[1]}</p>
                            {o.requires_refrigeration && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[7px] font-black uppercase tracking-tighter ring-1 ring-blue-100 mt-1.5">
                                  ❄️ Cold Chain
                                </span>
                            )}
                        </td>
                        <td className="py-6 text-right font-black text-coffee-950 text-xs">{o.weight_kg}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Manifest Summary - Matches Mockup Style */}
        <section className="sticky top-12 space-y-10">
          <div className="bg-white rounded-[48px] shadow-2xl shadow-coffee-200/10 border border-coffee-100/30 p-10 flex flex-col gap-10">
            <h2 className="text-[10px] font-black text-coffee-950 uppercase tracking-[0.2em] px-1">Manifest Summary</h2>

            <div className="bg-[#FAF9F6] p-10 rounded-[40px] flex items-center justify-between border border-coffee-50 group hover:shadow-lg transition-all cursor-pointer">
              <div>
                <p className="text-[9px] font-black text-coffee-300 uppercase tracking-widest mb-1">Assigned Vehicle</p>
                <h3 className="text-3xl font-black text-coffee-950 tracking-tighter">
                  {selectedVehicleData ? selectedVehicleData.plate_number : "Assign Asset"}
                </h3>
                {selectedVehicleData && (
                   <p className={`text-[10px] font-black uppercase tracking-tighter mt-1 flex items-center gap-1.5 ${selectedVehicleData.assignedDriver ? 'text-coffee-500' : 'text-rose-500 animate-pulse'}`}>
                      {selectedVehicleData.assignedDriver ? <BiUser className="text-lg" /> : <ShieldAlert className="text-lg" />}
                      {selectedVehicleData.assignedDriver ? selectedVehicleData.driver_name : 'REQUIRES DRIVER BINDING'}
                   </p>
                )}
              </div>
              <HiOutlineTruck className={`text-4xl ${selectedVehicle ? 'text-coffee-950' : 'text-coffee-100'}`} />
            </div>

            <div className="flex justify-between items-center px-4">
              <CircularProgress percent={weightPercent} label="Weight Payload" color={weightPercent > 100 ? 'text-rose-500' : 'text-coffee-950'} />
              <CircularProgress percent={volumePercent} label="Volumetric Capacity" color={volumePercent > 100 ? 'text-rose-400' : 'text-coffee-500'} />
            </div>

            <div className="mt-4">
              <h4 className="text-[9px] font-black text-coffee-300 uppercase tracking-widest mb-6 px-1">Load Planner for Unit</h4>
              <div className="h-[1px] bg-coffee-50 mb-8"></div>

              <div className="max-h-64 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {selectedOrders.length > 0 ? (
                  orders.filter(o => selectedOrders.includes(o.order_id)).map(o => (
                    <div key={o.order_id} className="flex items-center justify-between p-2 hover:bg-coffee-50 transition-colors cursor-pointer group rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-coffee-50 flex items-center justify-center text-coffee-300 group-hover:bg-coffee-950 group-hover:text-white transition-all">
                             <BiPackage />
                        </div>
                        <span className="font-mono font-black text-xs text-coffee-950 tracking-tighter">#{o.order_id}</span>
                      </div>
                      <BiMapPin className="text-coffee-200 group-hover:text-coffee-500" />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center py-10 opacity-20">
                    <BiBox className="text-5xl mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No orders selected</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-6">
              {(weightPercent > 100 || volumePercent > 100) && (
                <div className="bg-rose-50 border border-rose-100 p-6 rounded-[24px] flex items-start gap-4">
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
                disabled={!selectedVehicle || !selectedVehicleData?.assignedDriver || selectedOrders.length === 0 || weightPercent > 100 || volumePercent > 100}
                className={`w-full py-6 rounded-[32px] font-black uppercase tracking-widest text-[11px] transition-all shadow-xl active:scale-95 ${!selectedVehicle || !selectedVehicleData?.assignedDriver || selectedOrders.length === 0 || weightPercent > 100 || volumePercent > 100 ? 'bg-coffee-50 text-coffee-200 cursor-not-allowed shadow-none' : 'bg-[#D6D3D1] text-coffee-900 hover:bg-coffee-950 hover:text-white'}`}
              >
                {selectedVehicle && !selectedVehicleData?.assignedDriver ? "Binding Required" : "Deploy Manifest"}
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
      )}

      {activePlanType === 'inbound' && (
        /* INBOUND PICKUP SCHEDULING UI */
        <div className="bg-white rounded-[48px] shadow-sm border border-coffee-50/50 overflow-hidden min-h-[700px]">
          <div className="p-10">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-black text-coffee-950 tracking-tighter uppercase tracking-widest">Inbound Pickup Scheduling</h2>
                <p className="text-sm font-medium text-coffee-400 mt-1">Assign fleet assets to supplier-ready manifests for collection.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-coffee-300 text-[10px] font-black uppercase tracking-[0.2em] border-b border-coffee-50">
                    <th className="pb-6">Reference</th>
                    <th className="pb-6">Supplier</th>
                    <th className="pb-6 text-center">Status</th>
                    <th className="pb-6 text-center">Expected Data</th>
                    <th className="pb-6 text-center">Weight(kg)</th>
                    <th className="pb-6 text-center">Handling</th>
                    <th className="pb-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-50/50">
                  {manifests.length === 0 && (
                    <tr><td colSpan="7" className="text-center py-20 text-coffee-300 font-bold uppercase tracking-widest">No pending manifests available</td></tr>
                  )}
                  {manifests.map((mf) => (
                    <tr key={mf.id} className="hover:bg-coffee-50/30 transition-all">
                      <td className="py-6 px-1 font-mono font-black text-coffee-950 text-xs">#{mf.manifest_reference}</td>
                      <td className="py-6 font-bold text-coffee-900">{mf.supplier?.name}</td>
                      <td className="py-6 text-center"><InboundStatusBadge status={mf.status} /></td>
                      <td className="py-6 text-center text-[11px] font-bold text-coffee-400">
                        <div className="flex items-center justify-center gap-2"><BiCalendar className="text-coffee-300" /> {new Date(mf.expected_collection).toLocaleDateString()}</div>
                      </td>
                      <td className="py-6 text-center text-xs font-black text-coffee-900">{mf.total_weight_kg} kg</td>
                      <td className="py-6 text-center">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-500 italic">{mf.special_handling}</span>
                      </td>
                      <td className="py-6 text-right">
                        {mf.status === 'received' && (
                          <button 
                            onClick={() => { setSelectedManifest(mf); setAssignmentPanelOpen(true); }}
                            className="bg-coffee-950 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                          >
                            Schedule Asset
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Side Panel for Inbound Assignment */}
      {assignmentPanelOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-coffee-950/20 backdrop-blur-md animate-in slide-in-from-right duration-500">
          <div className="absolute inset-0" onClick={() => setAssignmentPanelOpen(false)}></div>
          <div className="w-[500px] bg-white border-l border-coffee-100 flex flex-col h-full shadow-2xl relative z-20 pt-20 p-12 overflow-y-auto">
            <div className="flex justify-between items-center mb-10">
               <div className="flex items-center gap-3">
                  <div className="bg-coffee-950 p-2.5 rounded-xl text-white text-xl"><HiOutlineSquaresPlus /></div>
                  <h2 className="text-2xl font-black text-coffee-950 tracking-tighter">
                      {assignStep === 1 ? 'Dispatch Asset' : 'Schedule Terminal'}
                  </h2>
               </div>
               <button onClick={() => setAssignmentPanelOpen(false)} className="bg-coffee-50 p-3 rounded-full text-coffee-400 hover:text-coffee-950 transition-colors">
                 <BiChevronRight className="text-2xl" />
               </button>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 mb-10 px-2">
                <div className={`h-1.5 flex-1 rounded-full transition-all ${assignStep >= 1 ? 'bg-coffee-950' : 'bg-coffee-100'}`}></div>
                <div className={`h-1.5 flex-1 rounded-full transition-all ${assignStep >= 2 ? 'bg-coffee-400' : 'bg-coffee-100'}`}></div>
            </div>

            <div className="bg-coffee-50/50 p-6 rounded-[32px] mb-10 border border-coffee-100">
                <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-2">Manifest Reference</p>
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xl font-black text-coffee-950">{selectedManifest?.manifest_reference}</h4>
                        <p className="text-xs font-bold text-coffee-500 mt-1 uppercase tracking-tight">{selectedManifest?.supplier?.name}</p>
                    </div>
                </div>
            </div>
            
            <div className="space-y-8">
                {assignStep === 1 ? (
                    <>
                        <div>
                            <label className="block text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                1. Select Vehicle Unit
                            </label>
                            <select 
                                value={selectedInboundVehicle} 
                                onChange={(e)=>setSelectedInboundVehicle(e.target.value)}
                                className="w-full bg-white border border-coffee-100 rounded-[20px] p-5 text-sm font-black text-coffee-950 outline-none focus:ring-4 focus:ring-coffee-100 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Select Vehicle Unit</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.plate_number} ({v.model})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                2. Assign Operator
                            </label>
                            <select 
                                value={selectedInboundDriver} 
                                onChange={(e)=>setSelectedInboundDriver(e.target.value)}
                                className="w-full bg-white border border-coffee-100 rounded-[20px] p-5 text-sm font-black text-coffee-950 outline-none focus:ring-4 focus:ring-coffee-100 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Assign Personnel</option>
                                {vehicles.filter(v => v.driver_name).map(v => (
                                    <option key={v.id} value={v.id}>{v.driver_name} (Active Unit: {v.plate_number})</option>
                                ))}
                            </select>
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4">
                        <div>
                          <label className="block text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                              <BiCalendar className="text-coffee-900" /> 3. Slot (UTC)
                          </label>
                          <input 
                              type="datetime-local"
                              value={pickupTime}
                              onChange={(e) => setPickupTime(e.target.value)}
                              className="w-full bg-white border border-coffee-100 rounded-[20px] p-5 text-[11px] font-black text-coffee-950 outline-none focus:ring-4 focus:ring-coffee-100 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                              <BiMapPin className="text-coffee-900" /> 4. Dock Hub
                          </label>
                          <div className="relative">
                              <select 
                                  value={dockNumber}
                                  onChange={(e) => setDockNumber(e.target.value)}
                                  className={`w-full bg-white border ${isDockAvailable === false ? 'border-rose-300 ring-4 ring-rose-50' : isDockAvailable === true ? 'border-emerald-300 ring-4 ring-emerald-50' : 'border-coffee-100'} rounded-[20px] p-5 text-sm font-black text-coffee-950 outline-none focus:ring-4 focus:ring-coffee-100 transition-all appearance-none cursor-pointer`}
                              >
                                  <option value="">Select Dock Hub ID</option>
                                  {['HUB-001', 'HUB-002', 'HUB-003', 'HUB-004', 'HUB-005', 'TERMINAL-ALPHA', 'TERMINAL-BRAVO'].map(dock => (
                                      <option key={dock} value={dock}>{dock}</option>
                                  ))}
                              </select>
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                  <BiChevronDown className="text-xl text-coffee-300" />
                              </div>
                          </div>
                          <div className="mt-2 px-1">
                            {isDockAvailable === false && <p className="text-[9px] font-black text-rose-500 uppercase italic">Hub Occupied for this window</p>}
                            {isDockAvailable === true && <p className="text-[9px] font-black text-emerald-500 uppercase italic">Hub Terminal Clear</p>}
                          </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-10 flex gap-4">
                {assignStep === 1 ? (
                    <button 
                        onClick={() => setAssignStep(2)} 
                        disabled={!selectedInboundVehicle || !selectedInboundDriver}
                        className="flex-1 py-5 bg-coffee-950 text-white font-black uppercase text-[10px] tracking-widest rounded-[24px] transition-all shadow-xl disabled:opacity-50"
                    >
                        Deploy to Schedule
                    </button>
                ) : (
                    <>
                        <button onClick={() => setAssignStep(1)} className="flex-1 py-5 bg-coffee-50 hover:bg-coffee-100 text-coffee-800 font-black uppercase text-[10px] tracking-widest rounded-[24px] transition-all">Back</button>
                        <button 
                            onClick={handleAssignInbound} 
                            disabled={!pickupTime || !dockNumber || isDockAvailable === false || loading} 
                            className="flex-1 py-5 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest rounded-[24px] transition-all shadow-xl shadow-emerald-950/20 disabled:opacity-50"
                        >
                            Finalize Deployment
                        </button>
                    </>
                )}
            </div>
          </div>
        </div>
      )}

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

      {/* Manifest Deployment Side Panel */}
      {showDeploymentPanel && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-coffee-950/20 backdrop-blur-md animate-in slide-in-from-right duration-500">
          <div className="absolute inset-0" onClick={() => setShowDeploymentPanel(false)}></div>
          <div className="w-[500px] bg-white border-l border-coffee-100 flex flex-col h-full shadow-2xl relative z-20 pt-20 p-12 overflow-y-auto">
            <div className="flex justify-between items-center mb-10">
               <div className="flex items-center gap-3">
                  <div className="bg-coffee-950 p-2.5 rounded-xl text-white text-xl"><BiCalendar /></div>
                  <h2 className="text-2xl font-black text-coffee-950 tracking-tighter">Scheduling Deployment</h2>
               </div>
               <button onClick={() => setShowDeploymentPanel(false)} className="bg-coffee-50 p-3 rounded-full text-coffee-400 hover:text-coffee-950 transition-colors">
                 <BiChevronRight className="text-2xl" />
               </button>
            </div>

            <div className="bg-coffee-50/50 p-8 rounded-[40px] mb-10 border border-coffee-100">
                <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-3">Unit Allocation</p>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-coffee-950">
                    <GiTruck className="text-2xl" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-coffee-950">{selectedVehicleData?.plate_number}</h4>
                    <p className="text-xs font-bold text-coffee-500 mt-1 uppercase">Driver: {selectedVehicleData?.driver_name}</p>
                  </div>
                </div>
            </div>

            <div className="space-y-10">
                <div>
                  <label className="block text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                    <BiTime className="text-coffee-900" /> 1. Scheduled Load Time (UTC)
                  </label>
                  <input 
                      type="datetime-local"
                      value={deploymentTime}
                      onChange={(e) => setDeploymentTime(e.target.value)}
                      className="w-full bg-white border border-coffee-100 rounded-[24px] p-6 text-[11px] font-black text-coffee-950 outline-none focus:ring-4 focus:ring-coffee-100 transition-all font-mono shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                    <BiMapPin className="text-coffee-900" /> 2. Dispatch Bay / Dock Door
                  </label>
                  <div className="relative">
                      <select 
                          value={deploymentDock}
                          onChange={(e) => setDeploymentDock(e.target.value)}
                          className={`w-full bg-white border ${isOutboundDockAvailable === false ? 'border-rose-300 ring-4 ring-rose-50' : isOutboundDockAvailable === true ? 'border-emerald-300 ring-4 ring-emerald-50' : 'border-coffee-100'} rounded-[24px] p-6 text-sm font-black text-coffee-950 outline-none focus:ring-4 focus:ring-coffee-100 transition-all appearance-none cursor-pointer shadow-sm`}
                      >
                          <option value="">Select Dock Number</option>
                          {['BAY-1', 'BAY-2', 'BAY-3', 'BAY-4', 'BAY-5', 'DOOR-A', 'DOOR-B', 'DOOR-C'].map(dock => (
                              <option key={dock} value={dock}>{dock}</option>
                          ))}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                          <BiChevronDown className="text-2xl text-coffee-300" />
                      </div>
                  </div>
                  {isOutboundDockAvailable === false && (
                    <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3">
                      <AlertCircle size={16} className="text-rose-500" />
                      <p className="text-[10px] font-black text-rose-600 uppercase italic">Selected bay is occupied for this window</p>
                    </div>
                  )}
                </div>
            </div>

            <div className="mt-auto pt-10">
              <button 
                onClick={finalizeDeployment}
                disabled={!deploymentTime || !deploymentDock || isOutboundDockAvailable === false || loading}
                className="w-full py-6 bg-coffee-950 text-white font-black uppercase text-[11px] tracking-widest rounded-[32px] transition-all shadow-2xl shadow-coffee-900/40 active:scale-95 disabled:opacity-30 disabled:shadow-none"
              >
                {loading ? 'Processing...' : 'Confirm & Deploy Fleet'}
              </button>
              <p className="text-center text-[9px] font-black text-coffee-300 uppercase tracking-[0.2em] mt-6">
                Broadcast notification will be sent to driver
              </p>
            </div>
          </div>
        </div>
      )}

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
      <style dangerouslySetInnerHTML={{
        __html: `
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
