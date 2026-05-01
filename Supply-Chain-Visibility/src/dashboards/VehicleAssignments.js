import { useState, useEffect } from "react";
import api from "../api";
import { GiPathDistance } from "react-icons/gi";
import { BiHistory, BiTransferAlt, BiDetail, BiXCircle, BiUser, BiBadgeCheck, BiInfoCircle } from "react-icons/bi";
import toast from 'react-hot-toast';
import ConfirmationModal from '../UIComponents/ConfirmationModal';

export function AssignmentHistoryPopup({ vehicleId, onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
             try {
                 const res = await api.get(`assignments/vehicle_history/?vehicle_id=${vehicleId}`);
                 setHistory(res.data);
             } catch(e) { console.error("Failed to fetch history"); }
             setLoading(false);
        };
        fetchHistory();
    }, [vehicleId]);

    return (
        <div className="fixed inset-0 bg-[#3E2723]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-2xl border border-coffee-100 animate-fade-in-up flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-6 border-b border-coffee-100 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-coffee-900 tracking-tight flex items-center"><BiHistory className="mr-3 text-coffee-600"/> Asset Audit Trail</h2>
                        <p className="text-xs text-coffee-500 font-medium mt-1 uppercase tracking-widest">Historical Assignment Sequence</p>
                    </div>
                    <button onClick={onClose} className="text-coffee-400 hover:text-coffee-600 transition-colors p-2 bg-coffee-50 rounded-xl"><BiXCircle className="text-2xl"/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="w-12 h-12 border-4 border-coffee-100 border-t-coffee-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-bold text-coffee-400 uppercase tracking-widest">Decrypting Logs...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20 bg-coffee-50/30 rounded-3xl border-2 border-dashed border-coffee-100">
                            <BiInfoCircle className="text-4xl text-coffee-200 mx-auto mb-3"/>
                            <p className="text-coffee-500 font-bold">Static Asset: No historical assignments detected.</p>
                        </div>
                    ) : (
                        <div className="relative pl-8 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-coffee-100">
                            {history.map(record => (
                                <div key={record.id} className="relative group">
                                    <div className={`absolute -left-[2.1rem] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${record.status === 'Active' ? 'bg-coffee-600 animate-pulse' : 'bg-coffee-200'}`}></div>
                                    <div className={`p-5 rounded-2xl border transition-all ${record.status === 'Active' ? 'bg-coffee-50 border-coffee-100 shadow-md shadow-coffee-100/50' : 'bg-white border-coffee-50 hover:border-coffee-100'}`}>
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                            <div>
                                                <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-1">Authenticated Driver</p>
                                                <p className="text-base font-bold text-coffee-950 flex items-center gap-2">
                                                    <BiUser className="text-coffee-400"/> {record.driver_username}
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-4">
                                                    <div className="flex items-center text-[11px] font-bold text-coffee-500">
                                                        <BiDetail className="mr-1.5 text-coffee-300"/> Initiated: {new Date(record.assignment_start_date).toLocaleString()}
                                                    </div>
                                                    {record.assignment_end_date && (
                                                        <div className="flex items-center text-[11px] font-bold text-coffee-500">
                                                            <BiXCircle className="mr-1.5 text-rose-400"/> Terminated: {new Date(record.assignment_end_date).toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${record.status === 'Active' ? 'bg-white text-coffee-600 border-coffee-200' : 'bg-coffee-50/50 text-coffee-400 border-coffee-100'}`}>
                                                    {record.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VehicleAssignments() {
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [activePopup, setActivePopup] = useState(null);
    const [assignmentFormType, setAssignmentFormType] = useState('ASSIGN');
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    const [selectedDriverId, setSelectedDriverId] = useState("");
    const [loading, setLoading] = useState(false);
    const [revokeTarget, setRevokeTarget] = useState(null);
    const [suggestedVehicleIds, setSuggestedVehicleIds] = useState([]);

    const fetchData = async () => {
        try {
            const [vehRes, usrRes] = await Promise.all([
                api.get('vehicles/'),
                api.get('users/')
            ]);
            setVehicles(vehRes.data);
            setDrivers(usrRes.data.filter(u => u.role === 'driver'));
        } catch(e) { console.error(e); }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedDriverId) {
            api.get(`assignments/driver_history/?driver_id=${selectedDriverId}`).then(res => {
                const happyAssignments = res.data.filter(a => a.rating === 'happy');
                const vIds = happyAssignments.map(a => a.vehicle);
                setSuggestedVehicleIds([...new Set(vIds)]);
            }).catch(() => setSuggestedVehicleIds([]));
        } else {
            setSuggestedVehicleIds([]);
        }
    }, [selectedDriverId]);

    const unassignedVehicles = vehicles.filter(v => !v.assignedDriver);
    const assignedVehicles = vehicles.filter(v => v.assignedDriver);
    const assignedDriverIds = vehicles.map(v => v.assignedDriver).filter(id => id !== null);
    const availableDrivers = drivers.filter(d => !assignedDriverIds.includes(d.id));

    const handleAssignmentUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if(!selectedVehicleId) throw new Error("Please select a target vehicle unit.");
            if(!selectedDriverId) throw new Error("Please select an operative driver.");
            
            // Log for diagnostics
            console.log(`Attempting binding: Vehicle[${selectedVehicleId}] -> Driver[${selectedDriverId}]`);
            
            const driverIdInt = parseInt(selectedDriverId);
            if (isNaN(driverIdInt)) throw new Error("Invalid Driver ID format.");

            const response = await api.patch(`vehicles/${selectedVehicleId}/`, { 
                assignedDriver: driverIdInt 
            });
            
            console.log("Binding success:", response.data);
            toast.success("Assignment Initialized Successfully");
            setActivePopup(null);
            fetchData();
        } catch(err) { 
            console.error("Assignment failure details:", err);
            const data = err.response?.data;
            const errorMsg = data?.assignedDriver || data?.message || data?.detail || err.message || "Deployment failed";
            toast.error(typeof errorMsg === 'string' ? errorMsg : "Profile inconsistency detected. Please check driver role."); 
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-coffee-900 tracking-tight">Assignment Engine</h2>
                    <p className="text-sm text-coffee-500 font-medium">Define point-to-point operative bindings between assets and personnel.</p>
                </div>
                <button
                    className="bg-coffee-700 hover:bg-coffee-800 text-white px-6 py-3 rounded-2xl shadow-lg shadow-coffee-100 text-sm font-bold transition-all flex items-center transform active:scale-95"
                    onClick={() => {
                        setAssignmentFormType('ASSIGN');
                        setSelectedVehicleId(unassignedVehicles.length > 0 ? unassignedVehicles[0].id : "");
                        setSelectedDriverId(availableDrivers.length > 0 ? availableDrivers[0].id : "");
                        setActivePopup('ASSIGNMENT_FORM');
                    }}
                >
                    <GiPathDistance className="mr-2 text-xl" /> Initialize Binding
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Active Hub */}
                <div className="bg-white rounded-[32px] border border-coffee-100 p-6 sm:p-8 flex flex-col min-h-[500px] shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-coffee-950 flex items-center"><BiTransferAlt className="mr-3 text-coffee-500 text-2xl"/> Active Hub</h3>
                        <span className="bg-coffee-50 text-coffee-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{assignedVehicles.length} Operational</span>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 custom-scrollbar pr-3 space-y-4">
                        {assignedVehicles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 text-slate-300 text-3xl"><BiTransferAlt/></div>
                                <p className="text-sm font-bold text-slate-500">No active pairings detected.</p>
                            </div>
                        ) : assignedVehicles.map(v => {
                            const drv = drivers.find(d => d.id === v.assignedDriver);
                            return (
                                <div key={v.id} className="bg-coffee-50/30 border border-coffee-100 p-5 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-coffee-100/50 hover:border-coffee-200 transition-all group">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-black text-coffee-400 uppercase tracking-widest mb-1">Logistics Unit</p>
                                                <p className="text-xl font-black text-coffee-900 font-mono tracking-wider">{v.plate_number}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-coffee-400 uppercase tracking-widest mb-1">Attached Driver</p>
                                                <p className="text-base font-bold text-coffee-800">{drv ? drv.username : `ID: ${v.assignedDriver}`}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-coffee-100">
                                            <p className="text-[11px] font-bold text-coffee-400">{v.make_model} • {v.capacity}kg</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => setActivePopup(v.id)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white border border-coffee-100 rounded-xl text-coffee-400 hover:text-coffee-700 hover:border-coffee-200 transition-all shadow-sm flex items-center gap-2">
                                                    <BiHistory/> Audit
                                                </button>
                                                <button 
                                                    onClick={() => setRevokeTarget(v)}
                                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-rose-50 border border-rose-100 rounded-xl text-rose-600 hover:bg-rose-100 transition-all flex items-center gap-2">
                                                    <BiXCircle/> Terminate
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Unassigned Resources Binding Region */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden ring-4 ring-indigo-500/30">
                        <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl"><BiTransferAlt/></div>
                        <h3 className="text-2xl font-black mb-4 flex items-center relative z-10 text-indigo-100"><BiBadgeCheck className="mr-3 text-indigo-400 text-3xl"/> Unassigned Resources</h3>
                        <p className="text-sm font-medium text-indigo-200 mb-8 relative z-10 border-b border-indigo-700/50 pb-4">Available units ready to be paired for deployment.</p>
                        <div className="grid grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-4">
                                <p className="text-xs font-black text-indigo-300 uppercase tracking-widest bg-indigo-950/50 py-2 px-3 rounded-xl border border-indigo-500/30 inline-block shadow-sm">Unassigned Vehicles ({unassignedVehicles.length})</p>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {unassignedVehicles.map(v => (
                                        <div key={v.id} className="text-sm font-bold bg-indigo-950/40 border border-indigo-500/20 p-4 rounded-xl hover:bg-indigo-800/80 hover:border-indigo-400/50 transition-all flex justify-between items-center shadow-lg transform hover:-translate-y-1">
                                            <span className="font-mono tracking-wider text-white text-lg">{v.plate_number}</span>
                                            <span className="text-indigo-200 font-bold opacity-90 px-2 py-1 bg-indigo-900 rounded-md text-[10px] uppercase">{v.vehicle_type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <p className="text-xs font-black text-emerald-300 uppercase tracking-widest bg-emerald-950/50 py-2 px-3 rounded-xl border border-emerald-500/30 inline-block shadow-sm">Unassigned Personnel ({availableDrivers.length})</p>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {availableDrivers.map(d => (
                                        <div key={d.id} className="text-sm font-bold bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl hover:bg-emerald-900/60 hover:border-emerald-400/50 transition-all shadow-lg transform hover:-translate-y-1">
                                            <p className="text-white text-lg flex items-center gap-2"><BiUser className="text-emerald-400"/> {d.username}</p>
                                            <p className="text-xs text-emerald-200/80 font-bold mt-1 ml-7">{d.email}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-coffee-600 rounded-[32px] p-6 text-white flex items-center justify-between shadow-lg shadow-coffee-200">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Throughput</p>
                            <p className="text-2xl font-black tracking-tight">All Ops Healthy</p>
                        </div>
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner backdrop-blur-sm">
                            <GiPathDistance/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignment form popup */}
            {activePopup === 'ASSIGNMENT_FORM' && (
                <div className="fixed inset-0 bg-[#3E2723]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md border border-coffee-100 animate-fade-in-up">
                        <div className="mb-6 text-center">
                            <div className="w-16 h-16 bg-coffee-50 text-coffee-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 scale-110 shadow-inner"><GiPathDistance /></div>
                            <h2 className="text-2xl font-bold text-coffee-950 tracking-tight">Create Secure Binding</h2>
                            <p className="text-sm text-coffee-500 mt-1">Orchestrate a new operative connection between asset and personnel.</p>
                        </div>
                        
                        <form onSubmit={handleAssignmentUpdate} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-coffee-400 mb-1.5 uppercase tracking-widest">Select Available Driver</label>
                                    <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)} required className="w-full bg-coffee-50 border border-coffee-200 rounded-xl px-4 py-3 text-sm font-bold text-coffee-700 focus:ring-8 focus:ring-coffee-500/5 focus:border-coffee-500 outline-none transition-all">
                                        <option value="" disabled>-- Detect Driver --</option>
                                        {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.username} ({d.email})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-coffee-400 mb-1.5 uppercase tracking-widest">Select Available Vehicle</label>
                                    <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)} required className="w-full bg-coffee-50 border border-coffee-200 rounded-xl px-4 py-3 text-sm font-bold text-coffee-700 focus:ring-8 focus:ring-coffee-500/5 focus:border-coffee-500 outline-none transition-all">
                                        <option value="" disabled>-- Detect Asset --</option>
                                        {unassignedVehicles.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {v.plate_number} ({v.make_model}) {suggestedVehicleIds.includes(v.id) ? '⭐⭐⭐ RECOMMENDED' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-amber-50/50 border border-amber-100/50 rounded-2xl flex gap-3">
                                <BiInfoCircle className="text-amber-600 text-xl shrink-0 mt-0.5"/>
                                <p className="text-[11px] font-black text-amber-800 leading-relaxed uppercase tracking-wider opacity-60">
                                    Initiating this binding will create a unique audit record and enable real-time telemetry tracking for the selected unit.
                                </p>
                            </div>

                            <div className="flex justify-end pt-2 gap-3">
                                <button type="button" onClick={() => setActivePopup(null)} className="px-6 py-3 text-sm font-bold text-coffee-400 hover:bg-coffee-50 rounded-xl transition-all">Abort</button>
                                <button type="submit" disabled={loading} className="bg-coffee-900 hover:bg-coffee-800 text-white px-8 py-3 rounded-xl shadow-lg shadow-coffee-100 text-sm font-bold transition-all disabled:opacity-70">Initialize Deployment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal 
                isOpen={!!revokeTarget}
                title="Terminate Assignment"
                message={revokeTarget ? `Are you sure you want to terminate the current assignment for unit ${revokeTarget.plate_number}? This will halt active telemetry tracking.` : ''}
                confirmText="Terminate Deployment"
                cancelText="Retain Mapping"
                onConfirm={async () => {
                    if (revokeTarget) {
                        try {
                            if ((revokeTarget.current_load_weight || 0) > 0) {
                                toast.error(`Termination Blocked: unit ${revokeTarget.plate_number} has active order shipments assigned.`);
                                setRevokeTarget(null);
                                return;
                            }
                            await api.patch(`vehicles/${revokeTarget.id}/`, { assignedDriver: null });
                            toast.success("Assignment Terminated");
                            fetchData();
                        } catch (err) { toast.error("Termination failed"); }
                    }
                    setRevokeTarget(null);
                }}
                onCancel={() => setRevokeTarget(null)}
            />

            {activePopup && activePopup !== 'ASSIGNMENT_FORM' && <AssignmentHistoryPopup vehicleId={activePopup} onClose={() => setActivePopup(null)} />}
        </div>
    );
}
