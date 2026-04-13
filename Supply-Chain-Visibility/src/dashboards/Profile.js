import { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { 
    BiUser, BiEnvelope, BiShieldQuarter, 
    BiBuilding, BiPhone, BiCreditCard, BiCalendar,
    BiLoaderAlt, BiLogOut
} from "react-icons/bi";
import { toast } from "react-hot-toast";

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await api.get('me/');
                setUser(res.data);
            } catch (error) {
                toast.error("Failed to retrieve profile data.");
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <BiLoaderAlt className="animate-spin text-coffee-500 text-4xl" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20 text-coffee-400">
                <p>Profile data unavailable. Please re-authenticate.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
            {/* Hero Profile Section */}
            <div className="bg-white rounded-[32px] shadow-sm border border-coffee-100 overflow-hidden relative">
                <div className="h-32 bg-gradient-to-r from-coffee-500 to-coffee-400 relative">
                    <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                </div>
                
                <div className="px-8 pb-8 flex flex-col items-center -mt-16 relative z-10">
                    <div className="w-32 h-32 rounded-[40px] bg-white p-2 shadow-xl">
                        <div className="w-full h-full rounded-[32px] bg-coffee-50 border-4 border-white flex items-center justify-center text-coffee-700 text-4xl font-black">
                            {user.username.substring(0, 2).toUpperCase()}
                        </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                        <h1 className="text-2xl font-black text-coffee-950 tracking-tight">{user.username}</h1>
                        <div className="flex items-center justify-center mt-1 space-x-2">
                            <span className="px-3 py-1 bg-coffee-50 text-coffee-600 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-coffee-100">
                                {user.role}
                            </span>
                            <span className="flex items-center text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                                Authenticated
                            </span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-coffee-50 grid grid-cols-3 divide-x divide-coffee-50">
                    <div className="py-4 text-center">
                        <p className="text-[10px] font-black text-coffee-300 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm font-bold text-coffee-700">Active</p>
                    </div>
                    <div className="py-4 text-center">
                        <p className="text-[10px] font-black text-coffee-300 uppercase tracking-widest mb-1">User ID</p>
                        <p className="text-sm font-mono font-bold text-coffee-700">#{user.id.toString().padStart(5, '0')}</p>
                    </div>
                    <div className="py-4 text-center">
                        <p className="text-[10px] font-black text-coffee-300 uppercase tracking-widest mb-1">Security</p>
                        <p className="text-sm font-bold text-coffee-700">Level 4</p>
                    </div>
                </div>
            </div>

            {/* Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-[28px] p-8 border border-coffee-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center mb-6 space-x-3">
                        <div className="w-10 h-10 bg-coffee-50 rounded-xl flex items-center justify-center text-coffee-600">
                            <BiUser className="text-xl" />
                        </div>
                        <h2 className="text-lg font-black text-coffee-950">Identity Record</h2>
                    </div>
                    
                    <div className="space-y-6">
                        <InfoItem label="Full Name" value={user.employee?.full_name || user.username} icon={<BiUser/>} />
                        <InfoItem label="Email Identity" value={user.email} icon={<BiEnvelope/>} />
                        <InfoItem label="National Identity" value={user.employee?.national_id || "Not Provided"} icon={<BiCreditCard/>} />
                        <InfoItem label="Date of Birth" value={user.employee?.date_of_birth || "Not Provided"} icon={<BiCalendar/>} />
                    </div>
                </div>

                <div className="bg-white rounded-[28px] p-8 border border-coffee-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center mb-6 space-x-3">
                        <div className="w-10 h-10 bg-coffee-50 rounded-xl flex items-center justify-center text-coffee-600">
                            <BiBuilding className="text-xl" />
                        </div>
                        <h2 className="text-lg font-black text-coffee-950">Resource Allocation</h2>
                    </div>
                    
                    <div className="space-y-6">
                        <InfoItem label="Operational Role" value={user.role} badge />
                        <InfoItem label="Primary Contact" value={user.employee?.contact_number || "Not Provided"} icon={<BiPhone/>} />
                        <InfoItem label="HQ Address" value={user.employee?.address || "Universal Hub"} />
                        <div className="pt-4 border-t border-coffee-50">
                             <p className="text-[10px] font-black text-coffee-300 uppercase tracking-widest mb-2">System Authority</p>
                             <div className="flex items-start space-x-2 bg-amber-50 rounded-xl p-3 border border-amber-100">
                                <BiShieldQuarter className="text-amber-600 text-lg mt-0.5" />
                                <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
                                    Your account is protected by enterprise-grade encryption. Access to critical resources is logged.
                                </p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex justify-center pt-4">
                <button 
                    onClick={() => {
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        localStorage.removeItem('user_id');
                        navigate('/', { replace: true });
                    }}
                    className="flex items-center space-x-2 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-50 px-6 py-3 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                >
                    <BiLogOut className="text-xl" />
                    <span>Terminate Session</span>
                </button>
            </div>
        </div>
    );
};

const InfoItem = ({ label, value, icon, badge }) => (
    <div className="flex flex-col">
        <p className="text-[10px] font-black text-coffee-300 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-center space-x-2">
            {icon && <span className="text-coffee-400">{icon}</span>}
            {badge ? (
                <span className="bg-coffee-900 text-white px-3 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest">
                    {value}
                </span>
            ) : (
                <p className="text-sm font-bold text-coffee-800 break-all">{value}</p>
            )}
        </div>
    </div>
);

export default Profile;
