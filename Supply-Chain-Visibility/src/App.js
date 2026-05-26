import logo from './assets/images/logo.svg';
import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import AdminTemplate from './AdminTemplate';
import DriverDashboard from './dashboards/driver';
import DispatcherDashboard from './dashboards/dispatcher';
import AdminDashboard from './dashboards/admin';
import UserManagement from './dashboards/UserManagement';
import VehicleManagement from './dashboards/VehicleManagement';
import LiveTracker from './dashboards/LiveTracker';
import { BiLockAlt, BiShieldQuarter, BiHide, BiShow, BiLoaderAlt, BiCheckShield, BiEnvelope } from 'react-icons/bi';
import { Toaster } from 'react-hot-toast';
import DispatchPlanning from './dashboards/DispatchPlanning';
import Reports from './dashboards/Reports';
import AuditLog from './dashboards/AuditLog';
import OrderManagement from './dashboards/OrderManagement';
import ShipmentManifest from './dashboards/ShipmentManifest';
import Profile from './dashboards/Profile';
import Settings from './dashboards/Settings';
import ManagerDashboard from './dashboards/ManagerDashboard';
import SupplierDeliveryManagement from './dashboards/SupplierDeliveryManagement';
import AdvancedSearch from './dashboards/AdvancedSearch';

import api from './api';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const roleRoutes = {
    dashboard: {
      driver: <DriverDashboard />,
      dispatcher: <DispatcherDashboard />,
      admin: <AdminDashboard />,
      manager: <ManagerDashboard />,
      customer: <div className="p-8"><h1 className="text-2xl font-bold text-slate-800">Customer Dashboard</h1><p>Welcome to your logistics portal tracking.</p></div>
    }
  };

  const getRoleFromLogin = (data) => {
    setRole(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    setUser(null);
    setRole(null);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('me/');
          setUser(res.data);
          setRole(res.data.role);
        } catch (error) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const applySettings = () => {
      try {
        const raw = localStorage.getItem('logistics_settings');
        if (raw) {
           const settings = JSON.parse(raw);
           if (settings.appearance) {
              // Apply Theme
              if (settings.appearance.theme === 'dark') {
                  document.documentElement.classList.add('dark-theme-override');
              } else {
                  document.documentElement.classList.remove('dark-theme-override');
              }
              
              // Apply Compact Mode
              if (settings.appearance.compactMode) {
                  document.documentElement.classList.add('compact-mode');
              } else {
                  document.documentElement.classList.remove('compact-mode');
              }
              
              // Apply Language
              if (settings.appearance.language) {
                  document.documentElement.lang = settings.appearance.language;
              }
           }
        }
      } catch (e) { /* ignore */ }
    };
    
    // Apply immediately
    applySettings();
    // Listen for cross-component updates
    window.addEventListener('settings_updated', applySettings);
    return () => window.removeEventListener('settings_updated', applySettings);
  }, []);

  if (loading) return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#FDFBF7]">
      <BiLoaderAlt className="animate-spin text-[#5D4037] text-5xl" />
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Redirect already-authenticated users away from login */}
        <Route path='/' element={
          user ? <Navigate to='/admin/dashboard' replace /> : (
          <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden">
            {/* Subtle radial gradient layer for depth */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(141,110,99,0.05),transparent_50%)] pointer-events-none"></div>
            
            <div className="w-full max-w-[1000px] bg-white rounded-[14px] shadow-[0_12px_44px_rgba(0,0,0,0.06)] flex overflow-hidden min-h-[580px] relative z-10 border border-[#F0EBE1]">
              
              {/* Left Side: Branding & Illustration */}
              <div className="hidden md:flex md:w-5/12 bg-[#F5F0EB] relative flex-col items-center justify-center p-10 overflow-hidden text-center border-r border-[#EAE3D9]">
                 <div className="absolute inset-0 opacity-[0.15] mix-blend-multiply pointer-events-none" style={{ backgroundImage: "radial-gradient(#8D6E63 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }}></div>
                 
                 <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EBE5DE] mb-6 flex items-center justify-center">
                        <img src={logo} alt="Nestle Logo" className="w-48 h-auto object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#3E2723] mb-3 tracking-tight">Logistics Portal</h1>
                    <p className="text-[#795548] text-sm leading-relaxed max-w-[250px]">
                       Streamline your global supply chain with real-time enterprise visibility.
                    </p>
                 </div>

                 {/* Decorative elements */}
                 <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white rounded-full opacity-[0.3] mix-blend-overlay filter blur-[40px]"></div>
                 <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#8D6E63] rounded-full opacity-[0.05] mix-blend-overlay filter blur-[40px]"></div>
              </div>

              {/* Right Side: Login Form */}
              <div className="w-full md:w-7/12 p-8 sm:p-14 flex flex-col justify-center bg-white relative">
                 <LoginCard sendDataToParent={getRoleFromLogin} setUser={setUser} />
              </div>
            </div>
          </div>
          )
        } />
        <Route element={<AdminTemplate userRole={role} userName={user?.username} onLogout={handleLogout} />}>
          <Route path='/admin/dashboard' element={user ? roleRoutes.dashboard[role] : <Navigate to='/' />} />
          <Route path='/admin/livetracker' element={<LiveTracker />} />
          <Route path='/admin/dispatch' element={role === 'dispatcher' ? <DispatchPlanning /> : <Navigate to='/admin/dashboard' />} />
          <Route path='/admin/orders' element={['admin', 'manager', 'dispatcher'].includes(role) ? <OrderManagement /> : <Navigate to='/admin/dashboard' />} />
          <Route path='/admin/shipments' element={['admin', 'manager', 'dispatcher'].includes(role) ? <ShipmentManifest /> : <Navigate to='/admin/dashboard' />} />
          <Route path='/admin/reports' element={<Reports />} />
          <Route path='/admin/users' element={role === 'admin' ? <UserManagement /> : <Navigate to='/admin/dashboard' />} />
          <Route path='/admin/vehicles' element={['admin', 'manager', 'dispatcher'].includes(role) ? <VehicleManagement /> : <Navigate to='/admin/dashboard' />} />
          <Route path='/admin/audit' element={role === 'admin' ? <AuditLog /> : <Navigate to='/admin/dashboard' />} />
          <Route path='/admin/search' element={['admin', 'manager'].includes(role) ? <AdvancedSearch /> : <Navigate to='/admin/dashboard' />} />
          <Route path='/admin/profile' element={<Profile />} />
          <Route path='/admin/settings' element={<Settings />} />
          <Route path='/admin/supplier-deliveries' element={['manager', 'dispatcher'].includes(role) ? <SupplierDeliveryManagement /> : <Navigate to='/admin/dashboard' />} />
        </Route>

      </Routes>
    </>
  );
}

function LoginCard({ sendDataToParent, setUser }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if(!identifier || !password) {
        setError("Please fill in all fields.");
        return;
    }
    setError("");
    setIsLoading(true);

    try {
      const res = await api.post('token/', {
        username: identifier,
        password: password
      });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('user_id', res.data.user_id);
      
      const userRes = await api.get('me/');
      const userRole = userRes.data.role;
      
      if (userRole === 'driver') {
          setError("Access Denied: Drivers are restricted to the mobile application. If you are an employee, please contact your administrator.");
          localStorage.clear();
          return;
      }

      sendDataToParent(userRole);
      if (setUser) {
          setUser(userRes.data);
      }
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.log("Login Error:", err.response);
      const errorMsg = err.response?.data?.detail || "Invalid credentials. Please try again.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] mx-auto">
      
      {/* Mobile Logo (Visible only on small screens) */}
      <div className="md:hidden flex flex-col items-center mb-6">
        <div className="bg-[#F5F0EB] p-5 rounded-xl mb-3 border border-[#EAE3D9] flex items-center justify-center">
           <img src={logo} alt="Nestle Logo" className="w-32 h-auto object-contain" />
        </div>
        <h2 className="text-xl font-bold text-[#3E2723]">Logistics Portal</h2>
      </div>

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-1.5 mb-2">
            <BiCheckShield className="text-[#8D6E63] text-lg" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#A1887F]">Secure Access</span>
        </div>
        <h2 className="text-3xl font-extrabold text-[#333333] tracking-tight mb-2">Welcome back</h2>
        <p className="text-sm text-[#8C7A70]">Sign in to your corporate account to continue.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        
        {/* Username/Email Input */}
        <div>
          <label className="block text-sm font-semibold text-[#4A4A4A] mb-1.5 ml-0.5">Username or Email</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <BiEnvelope className={`text-[1.1rem] transition-colors duration-300 ${identifier ? 'text-[#5D4037]' : 'text-[#BCAAA4] group-focus-within:text-[#5D4037]'}`} />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => {
                  setIdentifier(e.target.value);
                  if(error) setError("");
              }}
              className={`block w-full pl-10 pr-4 py-[0.8rem] bg-white border ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-[#EAE3D9] hover:border-[#D7CCC8] focus:border-[#8D6E63] focus:ring-[#8D6E63]/20'} rounded-[10px] text-sm text-[#333333] placeholder-[#BCAAA4] transition-all outline-none focus:ring-4`}
               placeholder="Username or email"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex justify-between items-center mb-1.5 ml-0.5 pr-1">
             <label className="block text-sm font-semibold text-[#4A4A4A]">Password</label>
             <button type="button" className="text-xs font-semibold text-[#5D4037] hover:text-[#8D6E63] transition-colors focus:outline-none">Forgot Password?</button>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <BiLockAlt className={`text-[1.1rem] transition-colors duration-300 ${password ? 'text-[#5D4037]' : 'text-[#BCAAA4] group-focus-within:text-[#5D4037]'}`} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                  setPassword(e.target.value);
                  if(error) setError("");
              }}
              className={`block w-full pl-10 pr-11 py-[0.8rem] bg-white border ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-[#EAE3D9] hover:border-[#D7CCC8] focus:border-[#8D6E63] focus:ring-[#8D6E63]/20'} rounded-[10px] text-sm text-[#333333] placeholder-[#BCAAA4] transition-all outline-none focus:ring-4`}
              placeholder="•••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A1887F] hover:text-[#5D4037] transition-colors focus:outline-none"
            >
              {showPassword ? <BiHide className="text-lg" /> : <BiShow className="text-lg" />}
            </button>
          </div>
        </div>

        {/* Remember Me & Error */}
        <div className="flex items-center justify-between mt-1">
            <div className="flex items-center group cursor-pointer">
                <div className="relative flex items-center">
                    <input 
                        id="remember-me" 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer w-4 h-4 text-[#5D4037] bg-white border-[#D7CCC8] rounded-[4px] focus:ring-[#8D6E63] focus:ring-2 cursor-pointer transition-all" 
                    />
                </div>
                <label htmlFor="remember-me" className="ml-2.5 text-sm text-[#795548] group-hover:text-[#4E342E] transition-colors cursor-pointer select-none">Remember me</label>
            </div>
        </div>

        {/* Error Message */}
        {error && (
            <div className="bg-[#FFF8F8] text-[#D32F2F] text-[13px] font-medium p-3.5 rounded-[10px] border border-[#FFEBEE] flex items-center shadow-sm">
                <BiShieldQuarter className="mr-2 text-lg shrink-0 text-[#EF5350]" />
                <span>{error}</span>
            </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-[0.85rem] px-4 border border-transparent rounded-[10px] shadow-[0_4px_14px_rgba(93,64,55,0.25)] text-[14px] font-bold text-white bg-[#5D4037] hover:bg-[#4E342E] hover:-translate-y-[1px] hover:shadow-[0_6px_20px_rgba(93,64,55,0.3)] focus:outline-none focus:ring-4 focus:ring-[#8D6E63]/30 transition-all duration-200 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_14px_rgba(93,64,55,0.25)] disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <BiLoaderAlt className="animate-spin text-xl mr-2" />
          ) : null}
          {isLoading ? "Authenticating..." : "Secure Login"}
        </button>

      </form>

      {/* Footer INFO */}
      <div className="mt-8 pt-5 text-center">
          <p className="text-[12px] text-[#A1887F] leading-relaxed">
              All access is monitored securely.<br/>
              Protected by Enterprise Gateway.
          </p>
      </div>
    </div>
  )
}

export default App;
