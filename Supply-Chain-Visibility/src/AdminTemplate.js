import { SlSettings } from 'react-icons/sl';
import { BiBell, BiUser, BiMenu, BiSearch, BiHistory, BiPackage, BiSelection } from 'react-icons/bi';
import { GiTruck, GiPathDistance } from 'react-icons/gi';
import { MdDashboard, MdMap, MdLocationOn } from 'react-icons/md';
import logo from './assets/images/logo.svg';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

const navItems = [
  { label: "Dashboard",       icon: <MdDashboard />, link: "/admin/dashboard" },
  { label: "Order Management",icon: <BiPackage />,   link: "/admin/orders" },
  { label: "Shipment Manifests", icon: <BiSelection />,link: "/admin/shipments" },
  { label: "Live Tracker",    icon: <MdLocationOn />,link: "/admin/livetracker" },
  { label: "Dispatch Planning", icon: <GiPathDistance />, link: "/admin/dispatch" },
  { label: "User Management", icon: <BiUser />,      link: "/admin/users" },
  { label: "Vehicle Mgmt",    icon: <GiTruck />,     link: "/admin/vehicles" },
  { label: "Audit Logs",      icon: <BiHistory />,   link: "/admin/audit" },
  { label: "Inbound Proc.",   icon: <BiSelection />, link: "/admin/inbound" },
  { label: "Advanced Search", icon: <BiSearch />,    link: "/admin/search" },
  { label: "Reports",         icon: <MdMap />,       link: "/admin/reports" },
  { label: "My Profile",      icon: <SlSettings />,  link: "/admin/profile" },
];

function AdminTemplate({ userRole, userName }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/');
  };

  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setProfileOpen(false); };

    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [profileOpen]);

  const getWelcomeMessage = () => {
    switch(userRole) {
        case 'admin': return "System Overview";
        case 'manager': return "Manager Console";
        case 'dispatcher': return "Dispatch Dashboard";
        case 'driver': return "Driver Portal";
        default: return `Welcome, ${userName || 'User'}`;
    }
  };

  return (
    <div className="flex h-screen bg-[#FCFBF9] font-sans overflow-hidden text-coffee-950">
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#3E2723] text-white transition-all duration-300 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-20`}>
         <div className="h-20 flex items-center justify-center border-b border-white/10 p-4 shrink-0 shadow-sm">
            {sidebarOpen ? (
                <div className="flex items-center space-x-2">
                    <div className="bg-white p-1.5 rounded-lg shadow-inner">
                        <img className="w-8 h-8 object-contain" src={logo} alt='Logo' />
                    </div>
                    <span className="text-sm font-extrabold tracking-tight uppercase text-white">Logistics</span>
                </div>
            ) : (
                <div className="bg-white p-1.5 rounded-lg shadow-inner">
                    <img className="w-8 h-8 object-cover" src={logo} alt='Logo' />
                </div>
            )}
         </div>
         <div className="flex-1 overflow-y-auto py-5 custom-scrollbar">
            <VerticalNavbar sidebarOpen={sidebarOpen} userRole={userRole} />
         </div>
         
         {/* Footer Status Mini */}
         {sidebarOpen && (
             <div className="p-4 border-t border-white/5 m-3 bg-white/5 rounded-2xl">
                 <p className="text-[10px] text-coffee-200/50 font-black uppercase mb-1 tracking-widest">System Engine</p>
                 <div className="flex items-center">
                     <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                     <span className="text-[11px] font-bold text-coffee-100/70 uppercase tracking-tight">Live & Secure</span>
                 </div>
             </div>
         )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#FCFBF9]">
         {/* Topbar */}
         <header className="h-20 bg-white/80 backdrop-blur-md border-b border-coffee-100 flex items-center justify-between px-6 lg:px-10 shadow-sm relative z-40 shrink-0">
            <div className="flex items-center">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-coffee-400 hover:text-coffee-900 mr-5 p-2.5 rounded-2xl hover:bg-coffee-50 transition-all focus:outline-none border border-transparent hover:border-coffee-100 shadow-sm hover:shadow-md">
                    <BiMenu className="text-2xl" />
                </button>
                <div className="hidden sm:block">
                    <h1 className="text-[17px] font-black text-coffee-950 tracking-tight">{getWelcomeMessage()}</h1>
                    <p className="text-[11px] text-coffee-500 font-bold uppercase tracking-widest opacity-60">Logistics Intelligence OS v2.0</p>
                </div>
            </div>
            
            <div className="flex items-center space-x-6">
                <div className="relative hidden lg:flex items-center text-coffee-200">
                    <BiSearch className="absolute left-4 text-xl text-coffee-300" />
                    <input type="text" placeholder="Omni-search resources..." className="bg-coffee-50/50 border border-coffee-100 rounded-[14px] pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-8 focus:ring-coffee-500/5 focus:border-coffee-400 transition-all w-80 placeholder-coffee-200 text-coffee-900 shadow-inner" />
                </div>
                
                <button className="relative text-coffee-400 hover:text-coffee-900 p-2.5 rounded-2xl hover:bg-coffee-50 transition-all border border-transparent hover:border-coffee-100">
                    <BiBell className="text-[1.4rem]" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white shadow-[0_0_8px_rgba(244,63,94,0.4)]"></span>
                </button>

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center space-x-4 focus:outline-none p-1.5 rounded-2xl hover:bg-coffee-50 transition-all border border-transparent hover:border-coffee-100 group">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-black text-coffee-950 leading-none tracking-tight group-hover:text-coffee-700">{userName || 'Administrator'}</p>
                            <p className="text-[10px] text-coffee-400 uppercase font-black mt-1.5 tracking-widest">{userRole || 'Admin'}</p>
                        </div>
                        <div className="w-11 h-11 rounded-[14px] bg-coffee-100 border border-coffee-200 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                            <span className="text-coffee-700 font-black text-sm tracking-tighter">
                                {(userName || userRole || 'A').substring(0,2).toUpperCase()}
                            </span>
                        </div>
                    </button>

                    {profileOpen && (
                        <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 mb-1 bg-slate-50/50">
                                <p className="text-sm font-bold text-slate-900">{userName || 'Administrator'}</p>
                                <p className="text-slate-500 text-[11px] font-medium tracking-wide">ID: AUTH-88219</p>
                            </div>
                            <div className="py-1">
                                <button className="w-full text-left px-5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center"><BiUser className="mr-3 text-lg opacity-70"/> My Account</button>
                                <button className="w-full text-left px-5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center"><SlSettings className="mr-3 text-lg opacity-70"/> Settings</button>
                            </div>
                            <div className="border-t border-slate-100 py-1 mt-1">
                                <button onClick={handleLogout} className="w-full text-left px-5 py-2.5 text-[13px] text-rose-600 hover:bg-rose-50 font-bold transition-colors flex items-center">
                                    <span className="text-lg mr-3 opacity-80">🚪</span> Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
         </header>

         {/* Main Outlet */}
         <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#FCFBF9] p-6 lg:p-10 custom-scrollbar relative">
            <div className="relative z-10">
                <Outlet />
            </div>
         </main>
      </div>
    </div>
  );
}

function VerticalNavbar({ sidebarOpen, userRole }) {
  const navigate = useNavigate();
  const location = useLocation();

  const filteredNavItems = navItems.filter(item => {
      // 1. Admin restricted modules
      if (item.label === "User Management" || item.label === "Audit Logs") {
          return userRole === 'admin';
      }
      // 2. Dispatcher restricted modules
      if (item.label === "Dispatch Planning") {
          return userRole === 'dispatcher';
      }
      // 3. Manager restricted modules
      if (item.label === "Advanced Search") {
          return userRole === 'manager';
      }
      // 4. Shared internal modules
      if (item.label === "Order Management" || item.label === "Shipment Manifests" || item.label === "Inbound Proc." || item.label === "Vehicle Mgmt") {
          return ['admin', 'manager', 'dispatcher'].includes(userRole);
      }
      return true;
  });

  return (
    <div className="flex flex-col space-y-1 px-3">
      {filteredNavItems.map((item) => {
        const isActive = location.pathname.startsWith(item.link);
        return (
          <button
            key={item.label}
            onClick={() => navigate(item.link)}
            className={`w-full flex items-center rounded-2xl transition-all duration-300 group relative ${
              isActive 
                ? 'bg-gradient-to-r from-coffee-500 to-coffee-400 shadow-lg shadow-coffee-950/20 transform scale-[1.03] active:scale-100' 
                : 'hover:bg-white/5 active:scale-95'
            }`}
          >
            {/* Active Accent */}
            {isActive && <div className="absolute -left-1 text-white opacity-50"><div className="w-1 h-5 bg-white rounded-full"></div></div>}
            
            <div className={`flex items-center w-full py-4 px-4`}>
              <div className={`text-[1.4rem] transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-md' : 'text-coffee-300 group-hover:text-white group-hover:translate-x-1'}`}>{item.icon}</div>
              {sidebarOpen && <p className={`ml-4 text-[13px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${isActive ? 'text-white' : 'text-coffee-200/50 group-hover:text-white'}`}>{item.label}</p>}
            </div>
          </button>
        )
      })}
    </div>
  );
}

export default AdminTemplate;