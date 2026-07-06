import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Gateways from './pages/Gateways';
import MulticastGroup from './pages/MulticastGroup';
import Devices from './pages/Devices';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DiagnosticTest from './pages/DiagnosticTest';
import Login from './pages/Login';
import DeviceDetail from './pages/DeviceDetail';
import AddDevice from './pages/AddDevice';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertsProvider, useAlerts, AlertItem } from './contexts/AlertsContext';
import { cn } from './lib/utils';
import { X, Battery, Lightbulb, AlertTriangle, ArrowRight, Activity, WifiOff, Bell, BellOff } from 'lucide-react';
import LockedPage from './components/LockedPage';
import SplashLoader from './components/SplashLoader';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode; pageName: string }> = ({ children, pageName }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  const canManage = !!(user?.isAdmin || user?.isTenantAdmin);
  if (!canManage) {
    return <LockedPage requiredPermission="Tenant Admin ขึ้นไป" pageName={pageName} />;
  }

  return <>{children}</>;
};

const AlertsModal: React.FC = () => {
  const { 
    alerts, 
    isAlertsModalOpen, 
    setAlertsModalOpen, 
    markAllAsRead 
  } = useAlerts();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  if (!isAlertsModalOpen) return null;

  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = filter === 'all' || 
      (filter === 'battery' && alert.type === 'battery') ||
      (filter === 'light_off' && alert.type === 'light_off') ||
      (filter === 'offline' && alert.type === 'offline');
    
    const matchesSearch = alert.deviceName.toLowerCase().includes(search.toLowerCase()) || 
      alert.devEui.toLowerCase().includes(search.toLowerCase()) || 
      alert.message.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getAlertIcon = (type: string, severity: string) => {
    let col = "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20";
    if (severity === 'high') col = "text-red-500 bg-red-50 dark:bg-red-950/20";
    
    switch (type) {
      case 'battery':
        return <div className={cn("p-2 rounded-xl", col)}><Battery className="w-4 h-4" /></div>;
      case 'light_off':
        return <div className={cn("p-2 rounded-xl", col)}><Lightbulb className="w-4 h-4" /></div>;
      case 'offline':
        return <div className={cn("p-2 rounded-xl", col)}><WifiOff className="w-4 h-4" /></div>;
      default:
        return <div className={cn("p-2 rounded-xl", col)}><AlertTriangle className="w-4 h-4" /></div>;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">System Anomalies & Fault Registry</h3>
              <p className="text-xs text-slate-500">Real-time alerts, loose sensors, and low solar battery systems</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={markAllAsRead} 
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline px-3 py-1.5 rounded-lg"
            >
              Clear Indicators ({unreadCountText(alerts.length)})
            </button>
            <button 
              onClick={() => setAlertsModalOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filter */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button 
              onClick={() => setFilter('all')} 
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", filter === 'all' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-300")}
            >
              All Errors
            </button>
            <button 
              onClick={() => setFilter('offline')} 
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", filter === 'offline' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-300")}
            >
              Offline
            </button>
            <button 
              onClick={() => setFilter('battery')} 
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", filter === 'battery' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-300")}
            >
              Battery Empty
            </button>
            <button 
              onClick={() => setFilter('light_off')} 
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", filter === 'light_off' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-300")}
            >
              Night Light Off
            </button>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Filter by Name, ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 w-full md:w-64 focus:outline-none"
            />
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 dark:text-white">All systems online as expected</p>
              <p className="text-xs text-slate-500 mt-1">No anomalies detected in your street light grid.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase">
                  <th className="py-3 px-6 h-10">Anomalous Element</th>
                  <th className="py-3 px-6 h-10">Device</th>
                  <th className="py-3 px-6 h-10">Dev EUI</th>
                  <th className="py-3 px-6 h-10">Diagnostic Cause</th>
                  <th className="py-3 px-6 h-10 text-center">Severity</th>
                  <th className="py-3 px-6 h-10 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAlerts.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                    <td className="py-3 px-6 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center space-x-2.5">
                        {getAlertIcon(e.type, e.severity)}
                        <span>{e.message}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 font-bold text-slate-800 dark:text-white truncate max-w-[140px]">{e.deviceName}</td>
                    <td className="py-3 px-6 font-mono text-slate-400 text-[11px]">{e.devEui}</td>
                    <td className="py-3 px-6 text-slate-500 max-w-[200px] leading-relaxed font-semibold">{e.details}</td>
                    <td className="py-3 px-6 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                        e.severity === 'high' ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400"
                      )}>
                        {e.severity}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <Link 
                        to={`/devices/${e.devEui}`}
                        onClick={() => setAlertsModalOpen(false)}
                        className="inline-flex items-center space-x-1.5 text-blue-600 dark:text-blue-400 hover:underline font-black uppercase tracking-wider"
                      >
                        <span>Check Dev</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/25 text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
          ⚡ System Diagnostic Node Connected • LoRaWAN Telemetry Protocol
        </div>
      </div>
    </div>
  );
};

const unreadCountText = (count: number) => {
  return `${count} Active`;
};

const AppContent: React.FC = () => {
  const [isSplashLoading, setIsSplashLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (!stored) {
        localStorage.setItem('theme', 'light');
        return false;
      }
      return stored === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleThemeChange = () => {
      setIsDarkMode(
        localStorage.getItem('theme') === 'dark'
      );
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  // Handle auto-closing and resizing
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 font-sans">
      {isAuthenticated && (
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => {
            if (window.innerWidth < 1024) {
              setSidebarOpen(false);
            }
          }} 
        />
      )}
      
      {/* Responsive mobile overlay backdrop */}
      {isAuthenticated && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs z-[1015] lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 flex flex-col min-w-0">
        {isAuthenticated && (
          <Navbar 
            onToggleSidebar={toggleSidebar} 
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        )}
        
        <main className={cn("flex-1 overflow-y-auto", isAuthenticated ? (location.pathname === '/devices/add' ? "p-2 sm:p-3 lg:p-4" : "p-2.5 sm:p-4 lg:p-5") : "")}>
          <div className={cn("mx-auto animate-in fade-in duration-500 w-full", isAuthenticated ? (location.pathname === '/devices/add' ? "max-w-none" : "max-w-[1920px]") : "")}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/gateways" element={<ProtectedRoute><Gateways /></ProtectedRoute>} />
              <Route path="/groups" element={<ProtectedRoute><MulticastGroup /></ProtectedRoute>} />
              <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
              <Route path="/devices/:devEui" element={<ProtectedRoute><DeviceDetail /></ProtectedRoute>} />
              <Route path="/devices/add" element={<AdminProtectedRoute pageName="หน้าลงทะเบียนอุปกรณ์ Add Device"><AddDevice /></AdminProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/test" element={<AdminProtectedRoute pageName="หน้าทดสอบระบบ Diagnostic Testing"><DiagnosticTest /></AdminProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      {isAuthenticated && <AlertsModal />}
      {isSplashLoading && <SplashLoader onComplete={() => setIsSplashLoading(false)} />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AlertsProvider>
        <Router>
          <AppContent />
        </Router>
      </AlertsProvider>
    </AuthProvider>
  );
};

export default App;
