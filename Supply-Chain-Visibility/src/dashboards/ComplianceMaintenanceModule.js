import React, { useState, useEffect } from "react";
import api from "../api";
import { ShieldAlert, CheckCircle, Bell, Truck, User } from "lucide-react";
import toast from "react-hot-toast";

export default function ComplianceMaintenanceModule() {
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Note: In a real app we'd fetch from specific endpoints for compliances
            const [vehRes, userRes] = await Promise.all([
                api.get('vehicles/'),
                api.get('users/')
            ]);
            setVehicles(vehRes.data);
            
            const driverData = userRes.data
                .filter(u => u.role === 'driver')
                .map(u => ({
                    driver_id: u.id,
                    employee: u.employee,
                    license_number: u.driver_profile?.license_number || 'N/A',
                    license_expiry_date: u.driver_profile?.license_expiry_date
                }));
            setDrivers(driverData);
        } catch (err) {
            toast.error("Failed to load compliance data");
        } finally {
            setLoading(false);
        }
    };

    const triggerNotification = async (type, id, name) => {
        try {
            toast.loading("Dispatching notification...");
            // Simulate API call to notification endpoint
            await new Promise(r => setTimeout(r, 800));
            toast.dismiss();
            toast.success(`Renewal reminder sent to ${name}`);
        } catch (err) {
            toast.dismiss();
            toast.error("Failed to send notification");
        }
    };

    const getExpiryStatus = (dateString) => {
        if (!dateString) return { status: 'missing', color: 'bg-slate-100 text-slate-500', label: 'Not Set' };
        const expiryDate = new Date(dateString);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { status: 'expired', color: 'bg-rose-100 text-rose-700', label: 'Expired' };
        if (diffDays <= 30) return { status: 'warning', color: 'bg-amber-100 text-amber-700', label: 'Expires Soon' };
        return { status: 'valid', color: 'bg-emerald-100 text-emerald-700', label: 'Valid' };
    };

    if (loading) {
        return <div className="p-10 text-center animate-pulse text-slate-400">Loading compliance data...</div>;
    }

    return (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-fade-in p-10">
            <div className="border-b border-slate-50 pb-6 mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-950 tracking-tighter flex items-center gap-3">
                        <ShieldAlert className="text-blue-500" /> 
                        Fleet & Personnel Compliance Hub
                    </h2>
                    <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
                        Track Expiries & Maintenance Schedules
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Vehicles Compliance */}
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                        <Truck size={18} /> Vehicle Asset Compliance
                    </h3>
                    <div className="space-y-4">
                        {vehicles.map(v => {
                            const regStatus = getExpiryStatus(v.registration_expiry);
                            const insStatus = getExpiryStatus(v.insurance_expiry);
                            
                            return (
                                <div key={v.vehicle_id} className="p-5 border border-slate-100 rounded-2xl hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="font-black text-slate-900 text-lg">{v.plate_number}</p>
                                            <p className="text-xs text-slate-500">{v.manufacturer} {v.model}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-slate-400 uppercase tracking-widest text-[9px]">Registration</span>
                                            <span className={`px-2 py-1 rounded w-max ${regStatus.color}`}>{v.registration_expiry || 'N/A'} - {regStatus.label}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-slate-400 uppercase tracking-widest text-[9px]">Insurance</span>
                                            <span className={`px-2 py-1 rounded w-max ${insStatus.color}`}>{v.insurance_expiry || 'N/A'} - {insStatus.label}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                        <button 
                                            onClick={() => triggerNotification('vehicle', v.vehicle_id, v.plate_number)}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                                        >
                                            <Bell size={14} /> Request Renewal
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {vehicles.length === 0 && <p className="text-sm text-slate-400">No vehicles found.</p>}
                    </div>
                </div>

                {/* Drivers Compliance */}
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                        <User size={18} /> Personnel License Compliance
                    </h3>
                    <div className="space-y-4">
                        {drivers.map(d => {
                            const licStatus = getExpiryStatus(d.license_expiry_date);
                            
                            return (
                                <div key={d.driver_id} className="p-5 border border-slate-100 rounded-2xl hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="font-black text-slate-900 text-lg">{d.employee?.full_name || `Driver #${d.driver_id}`}</p>
                                            <p className="text-xs text-slate-500">License: {d.license_number}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 text-xs font-bold">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-slate-400 uppercase tracking-widest text-[9px]">License Expiry</span>
                                            <span className={`px-2 py-1 rounded w-max ${licStatus.color}`}>{d.license_expiry_date || 'N/A'} - {licStatus.label}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                        <button 
                                            onClick={() => triggerNotification('driver', d.driver_id, d.employee?.full_name || 'Driver')}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                                        >
                                            <Bell size={14} /> Send Reminder
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {drivers.length === 0 && <p className="text-sm text-slate-400">No drivers found.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
