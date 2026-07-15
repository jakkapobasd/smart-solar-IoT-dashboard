import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  Leaf, 
  RefreshCcw, 
  Download, 
  Laptop, 
  Smartphone, 
  Info,
  Cpu,
  Zap,
  Network,
  Mail,
  MailOpen,
  Eye,
  EyeOff,
  Edit2,
  Shield,
  ShieldAlert,
  Check,
  AlertTriangle,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  Save,
  Bell,
  BellRing,
  Copy,
  X,
  Lightbulb,
  Battery,
  Inbox,
  Send,
  Terminal
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const canManageEmail = !!(user?.isAdmin || user?.isTenantAdmin);
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  // Analytics diagnostic states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [staleDevicesCount, setStaleDevicesCount] = useState<number>(0);
  const [networkHealthIndex, setNetworkHealthIndex] = useState<number>(94);
  const [stats, setStats] = useState({
    gateways: 0,
    devices: 0,
    gwStatus: { online: 0, offline: 0, never: 0 },
    devStatus: { online: 0, offline: 0, never: 0 }
  });

  // PWA/Desktop Installation States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [pwaActive, setPwaActive] = useState(false);

  // Email Alerting States
  const [recipientEmail, setRecipientEmail] = useState('');
  const [alertTriggers, setAlertTriggers] = useState({
    offline: true,
    lowBattery: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);


  // Push Notification States
  const [notificationSupport, setNotificationSupport] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [mockNotificationMsg, setMockNotificationMsg] = useState<{ type: 'success' | 'info' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationSupport(true);
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const sendLocalNotification = async (title: string, body: string, options: any = {}) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const defaultOptions = {
      body,
      icon: '/images/Lekise-icon.png',
      badge: '/images/Lekise-icon.png',
      tag: 'lekise-alert',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      ...options
    };

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, defaultOptions);
        return;
      } catch (e) {
        console.warn("Failed to show notification via service worker, falling back to local:", e);
      }
    }
    
    // Fallback to standard local Notification
    try {
      new Notification(title, defaultOptions);
    } catch (err) {
      console.error("Local Notification construct failed:", err);
    }
  };

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      setMockNotificationMsg({
        type: 'error',
        text: 'ขออภัย อุปกรณ์หรือเว็บบราวเซอร์ของคุณยังไม่เปิดใช้งานสิทธิ์ Notification API หรือไม่รองรับในสภาพแวดล้อม iFrame (แนะนำให้กดเปิดใช้ในแท็บใหม่)'
      });
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        sendLocalNotification(
          'เปิดสิทธิ์แจ้งเตือนสำเร็จ 🎉',
          'ยินดีต้อนรับ! ระบบพุชแจ้งเตือนสำหรับแอปพลิเคชัน Lekise Smart Solar ได้รับอนุญาตเรียบร้อยแล้ว'
        );
        setMockNotificationMsg({
          type: 'success',
          text: 'เปิดใช้งานและอนุญาตสิทธิ์การแจ้งเตือนสเตตัสพุช เรียบร้อยแล้ว!'
        });
      } else if (permission === 'denied') {
        setMockNotificationMsg({
          type: 'error',
          text: 'ปฏิเสธการเข้าถึงสิทธิ์แจ้งเตือน กรุณาเปิดอนุญาต Notification ด้วยการกดที่ไอคอนแม่กุญแจ 🔒 ข้างช่องใส่ URL'
        });
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
    }
  };

  const handleTriggerTestNotification = () => {
    if (Notification.permission !== 'granted') {
      handleRequestPermission();
      return;
    }

    sendLocalNotification(
      '🚨 ตรวจพบรายงานฉุกเฉิน (โคมไฟถนน #LK-089)',
      'โหนด LK-089 (โคมไฟสี่แยกดอนสะแก) ออฟไลน์ขณะทำงาน มีสัญญาณตกค้าง และอุณหภูมิแบตเตอรี่เกินพิกัด (>45°C)!',
      {
        tag: 'lekise-test-alarm',
        requireInteraction: true
      }
    );
    setMockNotificationMsg({
      type: 'success',
      text: 'ทดสอบส่งพุชแจ้งเตือนสำเร็จแล้ว! ตรวจสอบกล่องหรือแถบแจ้งเตือนของหน้าจอมือถือ/บราวเซอร์คุณได้ทันที'
    });
  };

  const handleScheduleBackgroundNotification = () => {
    if (Notification.permission !== 'granted') {
      handleRequestPermission();
      return;
    }
    
    setCountdown(5);
    setMockNotificationMsg({
      type: 'info',
      text: 'ระบบเริ่มนับถอยหลัง 5 วินาทีเรียบร้อยแล้ว... กรุณาย่อแอปพลิเคชันลง หรือไปเปิดแท็บอื่น หรือล็อคหน้าจอมือถือเพื่อทดสอบการแสดงผลขณะปิดแอป!'
    });
    
    // Start countdown
    const intervalId = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalId);
          
          setTimeout(() => {
            sendLocalNotification(
              '⚡ รายงานสถิติแผงโซลาร์ - Lekise Smart Solar',
              '⚠️ ตรวจพบแผงควบคุมโคมโซลาร์โซน D ฝั่งตะวันตก มีอุณหภูมิระบบพุ่งสูงเกินขีดจำกัดแนะเฉลี่ย (48.4°C) โปรดวางแผนตรวจสอบความเสถียร',
              {
                tag: 'lekise-scheduled-alert',
                requireInteraction: true
              }
            );
            setMockNotificationMsg({
              type: 'success',
              text: 'ทำการส่งการแจ้งเตือนแบบเบื้องหลัง (Background Push) ออกไปยังเครื่องโทรศัพท์/บราวเซอร์สำเร็จแล้ว!'
            });
          }, 300);
          
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Read stored optimization stats from localStorage
  const [cachedSavingsKb, setCachedSavingsKb] = useState(() => {
    const saved = localStorage.getItem('dashboard_bytes_saved');
    return saved ? parseFloat(saved) : 0;
  });

  const analyzeStats = async () => {
    if (!user?.tenantId || !user?.applicationId) return;
    setIsAnalyzing(true);
    try {
      const [gatewaysRes, devicesRes] = await Promise.all([
        api.get('/gateways', { params: { tenantId: user.tenantId, limit: 100 } }).catch(() => ({ data: { result: [], totalCount: 0 } })),
        api.get('/devices', { params: { applicationId: user.applicationId, limit: 100 } }).catch(() => ({ data: { result: [], totalCount: 0 } }))
      ]);

      const gwList = gatewaysRes.data?.result || [];
      const gwStatus = { online: 0, offline: 0, never: 0 };
      gwList.forEach((gw: any) => {
        if (gw.state === 'ONLINE') gwStatus.online++;
        else if (gw.state === 'OFFLINE') gwStatus.offline++;
        else gwStatus.never++;
      });

      const devList = devicesRes.data?.result || [];
      const devStatus = { online: 0, offline: 0, never: 0 };
      const now = Date.now();
      let staleCount = 0;

      devList.forEach((dev: any) => {
        if (!dev.lastSeenAt) devStatus.never++;
        else {
          const lastSeen = new Date(dev.lastSeenAt).getTime();
          const diffHours = (now - lastSeen) / 3600000;
          if (diffHours <= 2) {
            devStatus.online++;
            if (diffHours > 0.5) {
              staleCount++;
            }
          } else {
            devStatus.offline++;
          }
        }
      });

      setStaleDevicesCount(staleCount);
      setStats({
        gateways: gatewaysRes.data?.totalCount || gwList.length || 0,
        devices: devList.length || 0,
        gwStatus,
        devStatus
      });
      
      const saved = localStorage.getItem('dashboard_bytes_saved');
      if (saved) {
        setCachedSavingsKb(parseFloat(saved));
      }
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    analyzeStats();
  }, [user]);

  const toggleTheme = (theme: 'light' | 'dark') => {
    setThemeMode(theme);
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to notify the user they can install the PWA
      setPwaActive(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if the app is running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) deferredPrompt.prompt();
  };

  const handleEmailConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Saving email config:", { recipientEmail, alertTriggers });
      setToast({ show: true, message: 'บันทึกการตั้งค่าอีเมลสำเร็จ', type: 'success' });
    } catch (err) {
      setToast({ show: true, message: 'บันทึกการตั้งค่าล้มเหลว', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (toast?.show) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="card p-4 sm:p-6 md:p-8">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-tight flex items-center space-x-2">
            <Sun className="w-4 h-4 text-indigo-500" />
            <span>Theme Appearance & General Parameters</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-707 dark:text-slate-200">System Color Scheme</p>
                <p className="text-[11px] text-slate-400 leading-normal mt-1">Configure interface to match your preference.</p>
              </div>
              <div className="flex bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-0.5 rounded-xl text-xs font-bold shrink-0">
                <button
                  onClick={() => toggleTheme('light')}
                  className={cn(
                    "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    themeMode === 'light' ? "bg-slate-105 dark:bg-slate-755 text-indigo-655 font-extrabold shadow-sm" : "text-slate-400"
                  )}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
                <button
                  onClick={() => toggleTheme('dark')}
                  className={cn(
                    "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    themeMode === 'dark' ? "bg-slate-105 dark:bg-slate-755 text-indigo-400 font-extrabold shadow-sm" : "text-slate-400"
                  )}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-707 dark:text-slate-200">Telemetry Rate Limit</p>
                <p className="text-[11px] text-slate-400 leading-normal mt-1">Configures interval bandwidth buffers.</p>
              </div>
              <span className="font-mono text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 px-2.5 py-1 rounded-xl">600s checkback</span>
            </div>
          </div>

          {pwaActive && !isStandalone && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex justify-between items-center animate-in fade-in duration-300">
              <div>
                <p className="text-xs font-bold text-slate-707 dark:text-slate-200">Install Desktop App</p>
                <p className="text-[11px] text-slate-400 leading-normal mt-1">ติดตั้งแอปพลิเคชันลงบนเดสก์ท็อปเพื่อการเข้าถึงที่รวดเร็วยิ่งขึ้น</p>
              </div>
              <button
                onClick={handleInstallClick}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Install App</span>
              </button>
            </div>
          )}
        </div>

        {/* Toast for Email Config */}
        {toast && (
          <div className={cn(
            "fixed bottom-5 right-5 z-[10000] flex items-center p-4 rounded-2xl shadow-2xl border text-xs sm:text-sm font-semibold transition-all duration-300 transform scale-100 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md animate-bounce",
            toast.type === 'success' 
              ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : "text-red-500 dark:text-red-400 border-red-500/30"
          )}>
            <div className="mr-3">
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <span>{toast.message}</span>
          </div>
        )}

    </div>
  </div>
);
};

export default Settings;
