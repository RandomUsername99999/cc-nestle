import { SlSettings } from 'react-icons/sl';
import { BiBell, BiUser, BiMenu, BiSearch, BiHistory, BiPackage, BiSelection } from 'react-icons/bi';
import { GiTruck, GiPathDistance } from 'react-icons/gi';
import { MdDashboard, MdMap, MdLocationOn } from 'react-icons/md';
import logo from './assets/images/logo.svg';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from './hooks/useLanguage';

const navItemsData = [
  { key: "dashboard", icon: <MdDashboard />, link: "/admin/dashboard" },
  { key: "orders", icon: <BiPackage />, link: "/admin/orders" },
  { key: "shipments", icon: <BiSelection />, link: "/admin/shipments" },
  { key: "tracker", icon: <MdLocationOn />, link: "/admin/livetracker" },
  { key: "dispatch", icon: <GiPathDistance />, link: "/admin/dispatch" },
  { key: "users", icon: <BiUser />, link: "/admin/users" },
  { key: "vehicles", icon: <GiTruck />, link: "/admin/vehicles" },
  { key: "audit", icon: <BiHistory />, link: "/admin/audit" },
  { key: "supplierDeliveries", icon: <GiPathDistance />, link: "/admin/supplier-deliveries" },
  { key: "search", icon: <BiSearch />, link: "/admin/search" },
  { key: "reports", icon: <MdMap />, link: "/admin/reports" },
  { key: "settings", icon: <SlSettings />, link: "/admin/settings" },
];

function AdminTemplate({ userRole, userName, onLogout }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const { t } = useLanguage();

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/', { replace: true });
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
    switch (userRole) {
      case 'admin': return t('systemOverview');
      case 'manager': return t('managerConsole');
      case 'dispatcher': return t('dispatchDashboard');
      case 'driver': return t('driverPortal');
      default: return `${t('welcome')}, ${userName || 'User'}`;
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
          <div className="px-4 py-2 border-t border-white/5 m-3 bg-white/5 rounded-2xl space-y-3">
            <div>
              <p className="text-[10px] text-coffee-200/50 font-black uppercase mb-1 tracking-widest">System Engine</p>
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                <span className="text-[11px] font-bold text-coffee-100/70 uppercase tracking-tight">Live & Secure</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20"
            >
              🚪 Sign Out
            </button>
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
  const { t } = useLanguage();

  const [clickCounts, setClickCounts] = useState(() => {
    try {
      const saved = localStorage.getItem(`nav_clicks_${userRole}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const handleNavClick = (item) => {
    const newCounts = { ...clickCounts, [item.key]: (clickCounts[item.key] || 0) + 1 };
    setClickCounts(newCounts);
    localStorage.setItem(`nav_clicks_${userRole}`, JSON.stringify(newCounts));
    navigate(item.link);
  };

  const filteredNavItems = navItemsData.filter(item => {
    // 1. Admin restricted modules
    if (item.key === "users" || item.key === "audit" || item.key === "reports") {
      return userRole === 'admin';
    }
    // 2. Dispatcher restricted modules
    if (item.key === "dispatch") {
      return userRole === 'dispatcher';
    }
    // 3. Manager restricted modules
    if (item.key === "search") {
      return userRole === 'manager';
    }
    // 4. Shared internal modules
    if (item.key === "orders" || item.key === "shipments" || item.key === "vehicles") {
      return ['admin', 'manager', 'dispatcher'].includes(userRole);
    }
    // 5. Supplier deliveries restricted to dispatcher and manager
    if (item.key === "supplierDeliveries") {
      return ['manager', 'dispatcher'].includes(userRole);
    }
    // 6. Supplier specific modules
    if (userRole === 'supplier') {
        return ['dashboard', 'orders', 'profile', 'settings'].includes(item.key);
    }
    return true;
  }).sort((a, b) => {
    const countA = clickCounts[a.key] || 0;
    const countB = clickCounts[b.key] || 0;
    if (a.key === 'settings') return 1;
    if (b.key === 'settings') return -1;
    return countB - countA;
  });

  return (
    <div className="flex flex-col space-y-1 px-3">
      {filteredNavItems.map((item) => {
        const isActive = location.pathname.startsWith(item.link);
        return (
          <button
            key={item.key}
            onClick={() => handleNavClick(item)}
            className={`w-full flex items-center rounded-2xl transition-all duration-300 group relative ${isActive
              ? 'bg-gradient-to-r from-coffee-500 to-coffee-400 shadow-lg shadow-coffee-950/20 transform scale-[1.03] active:scale-100'
              : 'hover:bg-white/5 active:scale-95'
              }`}
          >
            {/* Active Accent */}
            {isActive && <div className="absolute -left-1 text-white opacity-50"><div className="w-1 h-5 bg-white rounded-full"></div></div>}

            <div className={`flex items-center w-full py-4 px-4`}>
              <div className={`text-[1.4rem] transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-md' : 'text-coffee-300 group-hover:text-white group-hover:translate-x-1'}`}>{item.icon}</div>
              {sidebarOpen && <p className={`ml-4 text-[13px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${isActive ? 'text-white' : 'text-coffee-200/50 group-hover:text-white'}`}>{t(item.key)}</p>}
            </div>
          </button>
        )
      })}
    </div>
  );
}

export default AdminTemplate;