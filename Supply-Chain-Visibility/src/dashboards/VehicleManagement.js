import { useState, useEffect } from "react";
import api from "../api";
import { BiPlus, BiPencil, BiTrash, BiTransferAlt, BiSearch, BiCalendar, BiPackage, BiBadgeCheck, BiInfoCircle, BiDownload, BiQrScan } from "react-icons/bi";
import { GiTruck, GiWeight, GiResize } from "react-icons/gi";
import toast from 'react-hot-toast';
import ConfirmationModal from '../UIComponents/ConfirmationModal';
import VehicleAssignments from './VehicleAssignments';
import { QRCodeSVG } from 'qrcode.react';

function QRCodePopup({ vehicle, onClose }) {
    return (
        <div className="fixed inset-0 bg-[#3E2723]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-sm border border-coffee-100 flex flex-col items-center text-center relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-coffee-400 hover:text-coffee-600 transition-colors">
                    <BiTrash className="text-2xl hidden" /> {/* spacer or generic close cross if we had one, just text is fine */}
                    ✕
                </button>
                <h2 className="text-2xl font-bold text-coffee-900 tracking-tight mb-2">Asset QR Code</h2>
                <p className="text-sm text-coffee-500 mb-8 font-medium">Driver can scan this to checkout/return</p>
                
                <div className="p-4 bg-white border-2 border-coffee-100 rounded-2xl shadow-sm mb-6">
                    <QRCodeSVG value={vehicle.id.toString()} size={200} level="H" />
                </div>
                
                <h3 className="text-3xl font-black text-coffee-950 font-mono tracking-widest">{vehicle.plate_number}</h3>
                <p className="text-xs font-bold text-coffee-400 mt-2 uppercase tracking-widest">{vehicle.vehicle_type} - {vehicle.make_model}</p>
                
                <button 
                    onClick={() => window.print()}
                    className="mt-8 bg-coffee-700 hover:bg-coffee-800 text-white w-full py-3 rounded-xl shadow-lg shadow-coffee-100 text-sm font-bold transition-all"
                >
                    Print Label
                </button>
            </div>
        </div>
    );
}


function AddVehiclePopup({ onSuccess, onClose }) {
    const [plateNumber, setPlateNumber] = useState("");
    const [vehicleType, setVehicleType] = useState("Truck");
    const [makeModel, setMakeModel] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [year, setYear] = useState(new Date().getFullYear());
    const [capacity, setCapacity] = useState("");
    const [volume, setVolume] = useState("");
    const [registrationExpiry, setRegistrationExpiry] = useState("");
    const [insuranceExpiry, setInsuranceExpiry] = useState("");
    const [isRefrigerated, setIsRefrigerated] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        
        try {
            // Sanitize data: convert empty strings to null for backend DateField compatibility
            const payload = {
                plate_number: plateNumber.trim().toUpperCase(),
                vehicle_type: vehicleType,
                make_model: makeModel,
                manufacturer: manufacturer,
                year: year ? parseInt(year) : null,
                capacity: capacity ? parseFloat(capacity) : null,
                volume: volume ? parseFloat(volume) : null,
                registration_expiry: registrationExpiry || null,
                insurance_expiry: insuranceExpiry || null,
                is_refrigerated: isRefrigerated
            };

            await api.post('vehicles/', payload);
            toast.success("Asset provisioned successfully");
            onSuccess();
        } catch (error) {
            console.error("Full Registration Error Response:", error.response?.data);
            const data = error.response?.data;
            let errorMsg = "Registration failed";
            
            if (data) {
                if (typeof data === 'string') {
                    errorMsg = data.substring(0, 100);
                } else if (data.message) {
                    errorMsg = data.message;
                } else if (data.detail) {
                    errorMsg = data.detail;
                } else {
                    const firstField = Object.keys(data)[0];
                    const message = Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField];
                    errorMsg = `${firstField}: ${message}`;
                }
            } else if (error.request) {
                errorMsg = "Server not responding. Check your connection.";
            }
            
            toast.error(errorMsg);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-[#3E2723]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-2xl border border-coffee-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-coffee-900 tracking-tight flex items-center"><GiTruck className="mr-3 text-coffee-600"/> Register Fleet Asset</h2>
                    <p className="text-sm text-coffee-500 mt-1">Provision a new logistics unit into the active operational inventory.</p>
                </div>

                <form id="registration-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                    {/* Identification */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-coffee-900 border-l-4 border-coffee-500 pl-3">Asset Identification</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <VehicleInputField label="Plate ID" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} required placeholder="LP-1234" icon={<BiBadgeCheck/>} />
                            <div>
                                <label className="block text-[11px] font-bold text-coffee-400 mb-1.5 uppercase tracking-widest">Asset Class</label>
                                <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="w-full bg-coffee-50 border border-coffee-200 rounded-xl px-4 py-2.5 text-sm font-bold text-coffee-700 outline-none">
                                    <option value="Truck">Heavy Duty Truck</option>
                                    <option value="Van">Cargo Van</option>
                                    <option value="Car">Sedan / Small Courier</option>
                                    <option value="Motorcycle">Two-Wheeler</option>
                                </select>
                            </div>
                            <VehicleInputField label="Make & Model" value={makeModel} onChange={e => setMakeModel(e.target.value)} required />
                            <VehicleInputField label="Manufacturer" value={manufacturer} onChange={e => setManufacturer(e.target.value)} required />
                            <VehicleInputField label="Year of Fab." type="number" value={year} onChange={e => setYear(e.target.value)} required />
                        </div>
                    </div>

                    {/* Operational Metrics */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 border-l-4 border-emerald-500 pl-3">Payload Specifications</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <VehicleInputField label="Payload Cap (KG)" type="number" step="0.1" value={capacity} onChange={e => setCapacity(e.target.value)} required icon={<GiWeight/>} />
                            <VehicleInputField label="Cargo Volume (m³)" type="number" step="0.01" value={volume} onChange={e => setVolume(e.target.value)} icon={<GiResize/>} />
                            <div className="sm:col-span-2 flex items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <input type="checkbox" id="addRefrigerated" checked={isRefrigerated} onChange={e => setIsRefrigerated(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500" />
                                <label htmlFor="addRefrigerated" className="ml-3 text-sm font-bold text-slate-700">Equipped with Cold Chain Management (Refrigerated)</label>
                            </div>
                        </div>
                    </div>

                    {/* Compliance */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 border-l-4 border-amber-500 pl-3">Compliance & Insurance</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <VehicleInputField label="Registration Expiry" type="date" value={registrationExpiry} onChange={e => setRegistrationExpiry(e.target.value)} required icon={<BiCalendar/>} />
                            <VehicleInputField label="Insurance Expiry" type="date" value={insuranceExpiry} onChange={e => setInsuranceExpiry(e.target.value)} required icon={<BiCalendar/>} />
                        </div>
                    </div>
                </form>

                <div className="flex justify-end items-center pt-6 mt-6 border-t border-coffee-100 gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-coffee-400 hover:bg-coffee-50 rounded-xl transition-all">Cancel</button>
                    <button type="submit" form="registration-form" disabled={loading} className="bg-coffee-700 hover:bg-coffee-800 text-white px-8 py-3 rounded-xl shadow-lg shadow-coffee-100 text-sm font-bold transition-all disabled:opacity-70">
                        {loading ? "Registering..." : "Provision Asset"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function EditVehiclePopup({ vehicle, onSuccess, onClose }) {
    const [plateNumber, setPlateNumber] = useState(vehicle.plate_number || "");
    const [vehicleType, setVehicleType] = useState(vehicle.vehicle_type || "Truck");
    const [makeModel, setMakeModel] = useState(vehicle.make_model || "");
    const [manufacturer, setManufacturer] = useState(vehicle.manufacturer || "");
    const [year, setYear] = useState(vehicle.year || new Date().getFullYear());
    const [capacity, setCapacity] = useState(vehicle.capacity || "");
    const [volume, setVolume] = useState(vehicle.volume || "");
    const [registrationExpiry, setRegistrationExpiry] = useState(vehicle.registration_expiry || "");
    const [insuranceExpiry, setInsuranceExpiry] = useState(vehicle.insurance_expiry || "");
    const [isRefrigerated, setIsRefrigerated] = useState(vehicle.is_refrigerated || false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.patch(`vehicles/${vehicle.id}/`, {
                plate_number: plateNumber.toUpperCase(),
                vehicle_type: vehicleType,
                make_model: makeModel,
                manufacturer: manufacturer,
                year: parseInt(year),
                capacity: parseFloat(capacity),
                volume: volume ? parseFloat(volume) : null,
                registration_expiry: registrationExpiry,
                insurance_expiry: insuranceExpiry,
                is_refrigerated: isRefrigerated
            });
            onSuccess();
        } catch (error) {
            toast.error("Update failed");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-2xl border border-slate-200 animate-fade-in-up">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center"><BiPencil className="mr-3 text-indigo-600"/> Edit Logistics Unit</h2>
                    <p className="text-sm text-slate-500 mt-1">Modify technical specifications or compliance records for this unit.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <VehicleInputField label="Plate ID" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} required icon={<BiBadgeCheck/>} />
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Asset Class</label>
                            <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none">
                                <option value="Truck">Heavy Duty Truck</option>
                                <option value="Van">Cargo Van</option>
                                <option value="Car">Sedan / Small Courier</option>
                                <option value="Motorcycle">Two-Wheeler</option>
                            </select>
                        </div>
                        <VehicleInputField label="Make & Model" value={makeModel} onChange={e => setMakeModel(e.target.value)} required />
                        <VehicleInputField label="Manufacturer" value={manufacturer} onChange={e => setManufacturer(e.target.value)} required />
                        <VehicleInputField label="Year" type="number" value={year} onChange={e => setYear(e.target.value)} required />
                        <VehicleInputField label="Capacity (KG)" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} required />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                        <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl shadow-lg shadow-indigo-100 text-sm font-bold transition-all">
                            {loading ? "Updating..." : "Synchronize Asset"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function VehicleManagement() {
    const [vehicles, setVehicles] = useState([]);
    const [activeAction, setActiveAction] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [activeTab, setActiveTab] = useState('FLEET');

    const downloadPdf = async (endpoint, filename) => {
        try {
            const res = await api.get(endpoint, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            toast.error("Failed to download document. Please check your permissions.");
        }
    };

    const fetchVehicles = async () => {
        try {
            const res = await api.get('vehicles/');
            setVehicles(res.data);
        } catch(e) { console.error(e); }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const filteredVehicles = vehicles.filter(v => 
        (v.plate_number || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (v.vehicle_type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.make_model || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-coffee-900 tracking-tight">Fleet Operations</h1>
                    <p className="text-coffee-500 font-medium mt-1">Orchestrate logistics assets and primary driver assignments.</p>
                </div>
                
                <div className="flex space-x-1 bg-coffee-50 p-1.5 rounded-[22px] shadow-inner border border-coffee-100">
                    <button 
                        onClick={() => setActiveTab('FLEET')}
                        className={`flex items-center px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-[16px] transition-all ${activeTab === 'FLEET' ? 'bg-white text-coffee-700 shadow-sm border border-coffee-100/50' : 'text-coffee-400 hover:text-coffee-600'}`}
                    >
                        <GiTruck className="mr-2 text-lg" /> Fleet Inventory
                    </button>
                    <button 
                        onClick={() => setActiveTab('ASSIGNMENTS')}
                        className={`flex items-center px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-[16px] transition-all ${activeTab === 'ASSIGNMENTS' ? 'bg-white text-coffee-700 shadow-sm border border-coffee-100/50' : 'text-coffee-400 hover:text-coffee-600'}`}
                    >
                        <BiTransferAlt className="mr-2 text-lg" /> Driver Pairings
                    </button>
                </div>
            </div>

            {/* Fleet Summary Bar */}
            <div className="bg-white border border-coffee-100 rounded-[32px] p-6 shadow-sm flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-end mb-3">
                        <h3 className="text-[11px] font-black text-coffee-400 uppercase tracking-[0.2em]">Operational Fleet Capacity</h3>
                        <span className="text-sm font-black text-coffee-950">
                            {vehicles.length > 0 ? Math.round((vehicles.filter(v => !v.status || v.status === 'Ready' || v.status === 'Active').length / vehicles.length) * 100) : 0}% Available
                        </span>
                    </div>
                    <div className="w-full h-4 bg-coffee-50 rounded-full overflow-hidden p-1 shadow-inner translate-z-0">
                        <div 
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                            style={{ width: `${vehicles.length > 0 ? (vehicles.filter(v => !v.status || v.status === 'Ready' || v.status === 'Active').length / vehicles.length) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 shrink-0">
                    <div className="bg-coffee-50/50 px-6 py-3 rounded-2xl border border-coffee-100">
                        <p className="text-[9px] font-black text-coffee-400 uppercase tracking-widest">Active Units</p>
                        <p className="text-xl font-black text-coffee-900">{vehicles.filter(v => v.status === 'Active').length}</p>
                    </div>
                    <div className="bg-coffee-50/50 px-6 py-3 rounded-2xl border border-coffee-100">
                        <p className="text-[9px] font-black text-coffee-400 uppercase tracking-widest">Total Payload</p>
                        <p className="text-xl font-black text-coffee-900">{vehicles.reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0).toLocaleString()} <span className="text-[10px]">KG</span></p>
                    </div>
                </div>
            </div>

            {activeTab === 'ASSIGNMENTS' ? (
                <VehicleAssignments />
            ) : (
                <div className="space-y-6 animate-fade-in">
                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative group flex-1 max-w-md w-full">
                            <BiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-coffee-400 text-xl group-focus-within:text-coffee-600 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search by plate, make or class..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-coffee-100 rounded-[24px] pl-14 pr-6 py-4 text-sm font-medium focus:ring-8 focus:ring-coffee-500/5 focus:border-coffee-500 outline-none transition-all shadow-sm placeholder-coffee-300"
                            />
                        </div>
                        <button
                            className="bg-coffee-700 hover:bg-coffee-800 text-white px-6 py-4 rounded-2xl shadow-lg shadow-coffee-100 text-sm font-bold transition-all flex items-center transform active:scale-95 shrink-0"
                            onClick={() => setActiveAction('ADD')}
                        >
                            <BiPlus className="mr-2 text-xl" /> Provision Asset
                        </button>
                    </div>

                    {/* Fleet List */}
                    <div className="space-y-4">
                        {filteredVehicles.length > 0 ? (
                            filteredVehicles.map(v => (
                                <div key={v.id} className="bg-white border border-coffee-100 p-4 sm:p-6 rounded-[32px] flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-2xl hover:shadow-coffee-100/30 transition-all hover:-translate-y-1 group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-coffee-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-[24px] bg-coffee-50 border border-coffee-100 flex items-center justify-center text-coffee-400 text-3xl group-hover:bg-coffee-100 group-hover:text-coffee-700 transition-all duration-500">
                                            <GiTruck />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <p className="text-3xl font-black text-coffee-950 tracking-wider font-mono">{v.plate_number}</p>
                                                {v.is_refrigerated && <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-widest flex items-center gap-1.5 shadow-sm">❄️ Cold Chain</span>}
                                            </div>
                                            <div className="flex flex-col gap-1 mt-2">
                                                <div className="flex items-center gap-2 text-lg font-black text-coffee-700">
                                                    <span className="text-coffee-300">|</span> <span className="uppercase tracking-widest text-xs text-coffee-500">OP:</span> {v.driver_name || 'UNASSIGNED'}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 font-semibold text-coffee-500 text-sm">
                                                    <span className="bg-coffee-50 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-tight border border-coffee-100/50">{v.vehicle_type}</span>
                                                    <span className="text-coffee-200">/</span>
                                                    <span className="text-coffee-800 text-lg">{v.make_model}</span>
                                                    <span className="bg-white border border-coffee-100 text-coffee-500 text-xs px-2 py-0.5 rounded-md shadow-sm font-black">{v.year}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 sm:gap-10">


                                        <VehicleStatusBadge status={v.status} />

                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => { setSelectedVehicle(v); setActiveAction('QR'); }}
                                                className="w-12 h-12 flex items-center justify-center rounded-[18px] border border-coffee-100 text-coffee-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all shadow-sm"
                                                title="Generate Physical QR Tag"
                                            >
                                                <BiQrScan className="text-xl" />
                                            </button>
                                            <button 
                                                onClick={() => downloadPdf(`reports/vehicle_usage_report/?vehicle_id=${v.id}`, `Vehicle_Usage_${v.plate_number}.pdf`)}
                                                className="w-12 h-12 flex items-center justify-center rounded-[18px] border border-coffee-100 text-coffee-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all shadow-sm"
                                                title="Download Monthly Usage Report"
                                            >
                                                <BiDownload className="text-xl" />
                                            </button>
                                            <button 
                                                onClick={() => { setSelectedVehicle(v); setActiveAction('EDIT'); }}
                                                className="w-12 h-12 flex items-center justify-center rounded-[18px] border border-coffee-100 text-coffee-400 hover:text-coffee-700 hover:bg-coffee-50 hover:border-coffee-200 transition-all shadow-sm"
                                                title="Edit Specifications"
                                            >
                                                <BiPencil className="text-xl" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if ((v.current_load_weight || 0) > 0) {
                                                        toast.error("Cannot decommission: Vehicle is assigned to an active shipment.");
                                                    } else {
                                                        setDeleteTarget(v);
                                                    }
                                                }}
                                                className="w-12 h-12 flex items-center justify-center rounded-[18px] border border-coffee-100 text-coffee-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all shadow-sm"
                                                title="Decommission Asset"
                                            >
                                                <BiTrash className="text-xl" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white border-2 border-dashed border-coffee-100 rounded-[48px] p-24 flex flex-col items-center justify-center text-center">
                                <div className="w-24 h-24 bg-coffee-50 rounded-[32px] flex items-center justify-center mb-6">
                                    <GiTruck className="text-5xl text-coffee-200" />
                                </div>
                                <h3 className="text-xl font-bold text-coffee-900 tracking-tight">No active assets detected</h3>
                                <p className="text-sm text-coffee-500 mt-2 max-w-sm font-medium">Synchronize your fleet database or provision a new logistics unit to begin tracking operations.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeAction === 'ADD' && <AddVehiclePopup onSuccess={() => { setActiveAction(null); fetchVehicles(); toast.success("Asset Provisioned"); }} onClose={() => setActiveAction(null)} />}
            {activeAction === 'EDIT' && selectedVehicle && <EditVehiclePopup vehicle={selectedVehicle} onSuccess={() => { setActiveAction(null); setSelectedVehicle(null); fetchVehicles(); toast.success("Asset Synchronized"); }} onClose={() => { setActiveAction(null); setSelectedVehicle(null); }} />}
            {activeAction === 'QR' && selectedVehicle && <QRCodePopup vehicle={selectedVehicle} onClose={() => { setActiveAction(null); setSelectedVehicle(null); }} />}
            
            <ConfirmationModal 
                isOpen={!!deleteTarget}
                title="Decommission Asset"
                message={deleteTarget ? (deleteTarget.driver_name ? `This item is currently bound. Do you want to revoke the binding and delete it?` : `Are you sure you want to decommission ${deleteTarget.plate_number}? This action will permanently remove the unit from active inventory.`) : ''}
                confirmText={deleteTarget?.driver_name ? "Revoke Binding & Delete" : "Confirm Decommission"}
                cancelText="Abort"
                onConfirm={async () => {
                    if (deleteTarget) {
                        try {
                            if (deleteTarget.driver_name) {
                                try {
                                    await api.patch(`vehicles/${deleteTarget.id}/`, { assignedDriver: null });
                                } catch (e) {
                                    // ignore unbind error if it still lets us delete
                                }
                            }
                            await api.delete(`vehicles/${deleteTarget.id}/`);
                            toast.success("Asset Decommissioned");
                            fetchVehicles();
                        } catch (err) { toast.error("Action failed"); }
                    }
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

function VehicleStatusBadge({ status }) {
    const isReady = !status || status === 'Ready' || status === 'Active';
    return (
        <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center w-max shadow-sm ${isReady ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-coffee-50 text-coffee-700 border-coffee-100'}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-2.5 ${isReady ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-coffee-500 shadow-[0_0_10px_rgba(121,85,72,0.3)]'}`}></span>
            {status || 'Operational'}
        </div>
    );
}

function VehicleInputField({ label, icon, value, onChange, type = "text", placeholder, required = false, step }) {
    return (
        <div>
            <label className="block text-[11px] font-bold text-coffee-400 mb-1.5 uppercase tracking-widest">{label}</label>
            <div className="relative group">
                {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400 group-focus-within:text-coffee-600 transition-colors text-lg">{icon}</div>}
                <input 
                    type={type} 
                    value={value} 
                    onChange={onChange} 
                    placeholder={placeholder} 
                    required={required}
                    step={step}
                    className={`w-full bg-coffee-50/30 border border-coffee-100 rounded-xl ${icon ? 'pl-11' : 'px-4'} py-2.5 text-sm font-bold text-coffee-700 focus:ring-8 focus:ring-coffee-500/5 focus:border-coffee-500 outline-none transition-all placeholder-coffee-200`} 
                />
            </div>
        </div>
    );
}
