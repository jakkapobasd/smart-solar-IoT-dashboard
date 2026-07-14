import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Wifi, 
  Users, 
  Cpu, 
  BarChart3, 
  Settings, 
  Zap,
  ChevronRight,
  Lock,
  LogOut
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isDevicesExpanded, setIsDevicesExpanded] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  const canManage = !!(user?.isAdmin || user?.isTenantAdmin);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Gateway', icon: Wifi, path: '/gateways' },
    { name: 'Multicast Group', icon: Users, path: '/groups' },
    { name: 'Devices', icon: Cpu, path: '/devices', dropdown: true },
    { name: 'Analytics', icon: BarChart3, path: '/reports' },
    { name: 'Settings', icon: Settings, path: '/settings', dropdown: true },
  ];

  return (
    <aside className={cn(
      "h-screen fixed lg:sticky top-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-[1020] flex flex-col shadow-2xl lg:shadow-none",
      isOpen 
        ? "w-60 translate-x-0" 
        : "-translate-x-full lg:translate-x-0 lg:w-16"
    )}>
      <div className="py-3 px-4 flex items-center space-x-2.5 h-14 border-b border-slate-100 dark:border-slate-800/60">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
          <Zap className="text-white w-4.5 h-4.5" />
        </div>
        {isOpen && (
          <div className="overflow-hidden">
            <h1 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight truncate">LEKISE APP</h1>
            <p className="text-[9px] text-slate-500 font-bold tracking-wider uppercase truncate">Control Panel</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2.5 space-y-0.5 mt-2.5 overflow-y-auto">
        {navItems.map((item) => {
          if (item.dropdown) {
            const isDevices = item.name === 'Devices';
            const isSettings = item.name === 'Settings';
            const isSubActive = isDevices 
              ? location.pathname.startsWith('/devices')
              : location.pathname.startsWith('/settings');
            
            const isExpanded = isDevices ? isDevicesExpanded : isSettingsExpanded;
            const toggleExpanded = () => isDevices 
              ? setIsDevicesExpanded(!isDevicesExpanded)
              : setIsSettingsExpanded(!isSettingsExpanded);

            return (
              <div key={item.name} className="space-y-0.5">
                <button
                  type="button"
                  onClick={toggleExpanded}
                  className={cn(
                    "w-full flex items-center space-x-2.5 py-1.5 px-2.5 rounded-lg transition-all duration-200 group relative text-left cursor-pointer",
                    isSubActive 
                      ? "bg-slate-50/80 dark:bg-slate-950/40 text-blue-600 dark:text-blue-400 font-bold" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  )}
                >
                  <item.icon className={cn("w-4.5 h-4.5 shrink-0", isSubActive ? "text-blue-600 dark:text-blue-400" : "group-hover:text-blue-605")} />
                  {isOpen && (
                    <div className="flex-1 flex justify-between items-center text-xs font-semibold truncate animate-in fade-in duration-350">
                      <span>{item.name}</span>
                      <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-200 text-slate-400", isExpanded ? "rotate-90 text-blue-600" : "")} />
                    </div>
                  )}
                </button>
                
                {isOpen && isExpanded && (
                  <div className="pl-3 space-y-0.5 transition-all">
                    {isDevices ? (
                      <>
                        <Link 
                          to="/devices"
                          onClick={onClose}
                          className={cn(
                            "flex items-center space-x-2 py-1.5 px-2 rounded-lg text-xs font-bold transition-all transition-colors duration-250 cursor-pointer ml-2.5",
                            location.pathname === '/devices'
                              ? "text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/25"
                              : "text-slate-500 dark:text-slate-405 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <div className={cn("w-1 h-1 rounded-full", location.pathname === '/devices' ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700")} />
                          <span className="text-[11px]">All Devices</span>
                        </Link>
                        {!canManage ? (
                          <div 
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-bold ml-2.5 cursor-not-allowed opacity-60 text-slate-400 dark:text-slate-650 select-none"
                            title="สิทธิ์การเข้าใช้งานกลุ่มถูกจำกัด"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <span className="text-[11px]">Add Device</span>
                            </div>
                            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                          </div>
                        ) : (
                          <Link 
                            to="/devices/add"
                            onClick={onClose}
                            className={cn(
                              "flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-bold transition-all transition-colors duration-250 cursor-pointer ml-2.5",
                              location.pathname === '/devices/add'
                                ? "text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/25"
                                : "text-slate-500 dark:text-slate-405 hover:text-slate-900 dark:hover:text-white"
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <div className={cn("w-1 h-1 rounded-full", location.pathname === '/devices/add' ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700")} />
                              <span className="text-[11px]">Add Device</span>
                            </div>
                          </Link>
                        )}
                      </>
                    ) : (
                      <>
                        <Link 
                          to="/settings"
                          onClick={onClose}
                          className={cn(
                            "flex items-center space-x-2 py-1.5 px-2 rounded-lg text-xs font-bold transition-all transition-colors duration-250 cursor-pointer ml-2.5",
                            location.pathname === '/settings'
                              ? "text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/25"
                              : "text-slate-500 dark:text-slate-405 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <div className={cn("w-1 h-1 rounded-full", location.pathname === '/settings' ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700")} />
                          <span className="text-[11px]">General Settings</span>
                        </Link>
                        {!canManage ? (
                          <div 
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-bold ml-2.5 cursor-not-allowed opacity-60 text-slate-400 dark:text-slate-650 select-none"
                            title="สิทธิ์การเข้าใช้งานกลุ่มถูกจำกัด"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <span className="text-[11px]">Testing</span>
                            </div>
                            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                          </div>
                        ) : (
                          <Link 
                            to="/settings/test"
                            onClick={onClose}
                            className={cn(
                              "flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-bold transition-all transition-colors duration-250 cursor-pointer ml-2.5",
                              location.pathname === '/settings/test'
                                ? "text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/25"
                                : "text-slate-500 dark:text-slate-405 hover:text-slate-900 dark:hover:text-white"
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <div className={cn("w-1 h-1 rounded-full", location.pathname === '/settings/test' ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700")} />
                              <span className="text-[11px]">Testing</span>
                            </div>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          }

          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center space-x-2.5 py-1.5 px-2.5 rounded-lg transition-all duration-200 group relative cursor-pointer",
                isActive 
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm shadow-blue-500/10" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-4.5 h-4.5 shrink-0", isActive ? "text-white" : "group-hover:text-blue-600")} />
              </div>
              {isOpen && (
                <div className="flex-1 flex justify-between items-center text-xs font-semibold truncate">
                  <span>{item.name}</span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 mt-auto border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/10 dark:bg-slate-950/2 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 px-1 py-0.5">
          <div className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[10px] font-medium shrink-0 uppercase border border-slate-200/50 dark:border-slate-700/50">
            {user?.username?.charAt(0) || 'U'}
          </div>
          {isOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-medium text-slate-650 dark:text-slate-300 truncate">{user?.username || 'User'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
