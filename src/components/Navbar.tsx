import React, { useState } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Settings, 
  User, 
  Sun, 
  Moon,
  ChevronDown,
  LayoutDashboard,
  Users,
  LogOut
} from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';

import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';

interface NavbarProps {
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onToggleSidebar, 
  isDarkMode, 
  onToggleDarkMode 
}) => {
  const { user, logout } = useAuth();
  const { unreadCount, setAlertsModalOpen } = useAlerts();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return 'Dashboard';
      case '/gateways': return 'Gateways Map';
      case '/groups': return 'Multicast Group';
      case '/devices': return 'Device List';
      case '/devices/add': return 'Add Device';
      case '/reports': return 'Reports';
      case '/settings': return 'Settings';
      case '/settings/test': return 'Diagnostic Test';
      default: return 'Smart Solar';
    }
  };

  return (
    <header className="h-14 sticky top-0 z-[1010] w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/60 px-3 sm:px-5 flex items-center justify-between transition-colors duration-500">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        <div className="hidden md:block">
          <h1 className="text-sm font-extrabold text-slate-800 dark:text-white leading-none uppercase tracking-wide">
            {getPageTitle(location.pathname)}
          </h1>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium mt-0.5">Welcome back, <span className="text-blue-650 dark:text-blue-405 font-bold">{user?.username || 'ADMIN'}</span>!</p>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button 
          onClick={onToggleDarkMode}
          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
        >
          {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setAlertsModalOpen(true)}
            className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all relative"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 border border-white dark:border-slate-950 rounded-full text-[7.5px] flex items-center justify-center text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <button 
          onClick={() => navigate('/settings')}
          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800/80 mx-1.5" />

        <div className="relative">
          <button 
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer text-left select-none"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-blue-100 dark:ring-blue-900/30 shrink-0 uppercase">
              {user?.username?.charAt(0) || 'A'}
            </div>
            <div className="hidden lg:block text-left mr-0.5">
              <div className="flex items-center space-x-1">
                <span className="text-[11px] font-bold text-slate-800 dark:text-white uppercase truncate max-w-[80px]">{user?.username || 'ADMIN'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <p className="text-[9px] text-slate-500 truncate -mt-0.5 font-medium">
                {user?.isAdmin ? "Super Admin" :
                 user?.isTenantAdmin ? "Tenant Admin" :
                 "Viewer"}
              </p>
            </div>
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <>
              {/* Overlay background to close the dropdown when clicking outside */}
              <div 
                className="fixed inset-0 z-50 cursor-default" 
                onClick={() => setIsProfileOpen(false)}
              />
              
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-55 py-2 animate-in fade-in slide-in-from-top-3 duration-150">
                {/* Header Profile Info inside dropdown */}
                <div className="px-5 py-3.5 flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 uppercase">
                    {user?.username?.charAt(0) || 'A'}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate capitalize">{user?.username || 'lekise'}</p>
                    <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold capitalize mt-0.5">
                      {user?.isAdmin ? "Super Admin" : user?.isTenantAdmin ? "Tenant Admin" : "Viewer"}
                    </p>
                  </div>
                </div>

                {/* Nav Links */}
                <div className="p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/');
                    }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-800/60 font-semibold text-xs tracking-wide text-left cursor-pointer transition-all border-none"
                  >
                    <LayoutDashboard className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/groups');
                    }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-800/60 font-semibold text-xs tracking-wide text-left cursor-pointer transition-all border-none"
                  >
                    <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>Multicast-Group</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-650 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-800/60 font-semibold text-xs tracking-wide text-left cursor-pointer transition-all border-none"
                  >
                    <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>Settings</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

                {/* Sign Out Button */}
                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold text-xs tracking-wide text-left cursor-pointer transition-all border-none"
                  >
                    <LogOut className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
