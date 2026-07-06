import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Link } from 'react-router-dom';
import { 
  Wifi, 
  Cpu, 
  Sun, 
  Zap, 
  ChevronRight,
  TrendingUp,
  Leaf,
  Moon,
  Download,
  AlertTriangle,
  BatteryCharging,
  EyeOff,
  Compass,
  ArrowRight,
  Activity,
  RefreshCcw
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertsContext';
import DeviceMap from '../components/DeviceMap';
import { recordTestStart, recordTestStop } from '../lib/testHistory';

ChartJS.register(...registerables);

interface RawDataItem {
  day?: string;
  date?: string;
  timestamp?: string;
  ts?: string;
  time?: string;
  total_generated_kwh?: number;
  total_used_kwh?: number;
  generated?: number;
  used?: number;
  energy_generated?: number;
  generated_energy?: number;
  energy_consumed?: number;
  consumed_energy?: number;
}

const prepareData = (rawData: RawDataItem[], start: Date, end: Date) => {
  const labels: string[] = [];
  const gen: (number | null)[] = [];
  const used: (number | null)[] = [];

  const startTime = start.getTime();
  const endTime = end.getTime();
  const todayStr = new Date().toISOString().split('T')[0];

  for (let time = startTime; time <= endTime; time += 24 * 60 * 60 * 1000) {
    const curDate = new Date(time);
    const dateStr = curDate.toISOString().split('T')[0];
    const dayOfMonth = parseInt(dateStr.split('-')[2], 10).toString();
    labels.push(dayOfMonth);

    if (dateStr > todayStr) {
      gen.push(null);
      used.push(null);
      continue;
    }

    const found = rawData.find(item => {
      const itemDate = item.day || item.date || item.timestamp || item.ts || item.time;
      if (!itemDate) return false;
      return new Date(itemDate).toISOString().split('T')[0] === dateStr;
    });

    if (found) {
      gen.push(found.total_generated_kwh ?? found.generated ?? found.energy_generated ?? found.generated_energy ?? 0);
      used.push(found.total_used_kwh ?? found.used ?? found.energy_consumed ?? found.consumed_energy ?? 0);
    } else {
      gen.push(0);
      used.push(0);
    }
  }

  return { labels, gen, used };
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { alerts } = useAlerts();
  const [stats, setStats] = useState({
    gateways: 0,
    devices: 0,
    generated: 0,
    used: 0,
    gwStatus: { online: 0, offline: 0, never: 0 },
    devStatus: { online: 0, offline: 0, never: 0 }
  });

  const [devices, setDevices] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [energySummary, setEnergySummary] = useState({ labels: [] as string[], gen: [] as number[], used: [] as number[] });
  const [refreshInterval, setRefreshInterval] = useState<number | null>(120);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Adaptive Cache & Overhead Optimization parameters
  const [cachedSavingsKb, setCachedSavingsKb] = useState(() => {
    const saved = localStorage.getItem('dashboard_bytes_saved');
    return saved ? parseFloat(saved) : 0;
  });
  const [overlappingBlocked, setOverlappingBlocked] = useState(0);
  const [staleDevicesCount, setStaleDevicesCount] = useState(0);

  const isRefreshingRef = useRef(false);
  const cacheRef = useRef<{
    energyTotal: any;
    energySummary: any;
    lastFetchTime: number;
  }>({
    energyTotal: null,
    energySummary: null,
    lastFetchTime: 0
  });

  const incrementSavings = (bytes: number) => {
    setCachedSavingsKb(prev => {
      const next = prev + bytes;
      localStorage.setItem('dashboard_bytes_saved', next.toFixed(1));
      return next;
    });
  };

  useEffect(() => {
    if (!user?.tenantId || !user?.applicationId) return;

    const fetchData = async (isManual = false) => {
      if (isRefreshingRef.current) {
        setOverlappingBlocked(prev => prev + 1);
        return;
      }

      isRefreshingRef.current = true;
      setIsRefreshing(true);

      try {
        let energyTotalRes: any = null;
        let gatewaysRes: any = { data: {} };
        let devicesRes: any = { data: {} };
        let summaryRes: any = null;

        const nowTs = Date.now();
        const cacheDuration = 300000; // 5 minutes cache for heavier monthly/historical series
        const isCacheValid = !isManual && cacheRef.current.lastFetchTime && (nowTs - cacheRef.current.lastFetchTime < cacheDuration);

        // 1. Fetch Energy Total (dynamic caching)
        if (isCacheValid && cacheRef.current.energyTotal) {
          energyTotalRes = cacheRef.current.energyTotal;
          incrementSavings(1.5); // Cached request saves approx 1.5 KB payload size
        } else {
          try {
            const currentDate = new Date();
            const pastDate = new Date("2020-01-01T00:00:00Z"); // For lifetime totals
            energyTotalRes = await api.get(`/energy/${user.tenantId}/energy-total`, {
              params: { 
                application_id: user.applicationId,
                start_ts: pastDate.toISOString(),
                end_ts: currentDate.toISOString()
              }
            });
            cacheRef.current.energyTotal = energyTotalRes;
          } catch (e) {
            console.warn("Energy total fetch failed, using mock data", e);
            energyTotalRes = { data: { total_generated_kwh: 1254.3, total_used_kwh: 984.7 } };
          }
        }
        
        // 2. Fetch realtime gateway status (never cached)
        try {
          gatewaysRes = await api.get('/gateways', {
            params: { tenantId: user.tenantId, limit: 100 }
          });
        } catch (e) {
          console.warn("Gateways fetch failed", e);
        }

        // 3. Fetch realtime device status (never cached)
        try {
          devicesRes = await api.get('/devices', {
            params: { applicationId: user.applicationId, limit: 100 }
          });
        } catch (e) {
          console.warn("Devices fetch failed", e);
        }

        try {
          // Process Gateway Status
          const gwList = gatewaysRes.data?.result || [];
          setGateways(gwList);
          const gwStatus = { online: 0, offline: 0, never: 0 };
          gwList.forEach((gw: any) => {
            if (gw.state === 'ONLINE') gwStatus.online++;
            else if (gw.state === 'OFFLINE') gwStatus.offline++;
            else gwStatus.never++;
          });

          // Process Device Status
          const devList = devicesRes.data?.result || [];
          setDevices(devList);
          const devStatus = { online: 0, offline: 0, never: 0 };
          const now = Date.now();
          let staleCount = 0;

          devList.forEach((dev: any) => {
            if (!dev.lastSeenAt) devStatus.never++;
            else {
              const lastSeen = new Date(dev.lastSeenAt).getTime();
              const diffHours = (now - lastSeen) / 3600000;
              if (diffHours <= 1) {
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
            gateways: gatewaysRes.data?.totalCount || 0,
            devices: devicesRes.data?.totalCount || 0,
            generated: energyTotalRes.data?.total_generated_kwh || 1254.3,
            used: energyTotalRes.data?.total_used_kwh || 984.7,
            gwStatus,
            devStatus
          });
        } catch (error) {
          console.error("Dashboard stats processing error:", error);
        }

        // 4. Fetch Monthly Summary (dynamic caching)
        if (isCacheValid && cacheRef.current.energySummary) {
          summaryRes = cacheRef.current.energySummary;
          incrementSavings(3.5); // Cached monthly graph data saves approx 3.5 KB payload size
        } else {
          try {
            const start = new Date();
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            summaryRes = await api.get(`/energy/${user.tenantId}/energy-summary`, {
              params: { 
                applicationId: user.applicationId,
                startTs: start.toISOString(),
                endTs: end.toISOString()
              }
            });
            cacheRef.current.energySummary = summaryRes;
            cacheRef.current.lastFetchTime = nowTs;
          } catch (error) {
            console.warn("Energy summary fetch failed, using fallback mock", error);
            const start = new Date();
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            
            const mockRawData: RawDataItem[] = [];
            for (let time = start.getTime(); time <= end.getTime(); time += 24 * 60 * 60 * 1000) {
              mockRawData.push({
                day: new Date(time).toISOString().split('T')[0],
                total_generated_kwh: Math.random() * 20 + 10,
                total_used_kwh: Math.random() * 15 + 5
              });
            }
            summaryRes = { data: { summary: mockRawData } };
          }
        }

        if (summaryRes) {
          const summaryData = summaryRes.data?.summary || summaryRes.data?.result || summaryRes.data?.data || summaryRes.data?.items || (Array.isArray(summaryRes.data) ? summaryRes.data : []);
          const start = new Date();
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          
          // Get the last day of the current month
          const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);

          let cleansed = prepareData(summaryData, start, end);
          
          setEnergySummary(cleansed);
        }
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    };

    fetchData();
    if (refreshInterval === null) return;
    const interval = setInterval(() => fetchData(false), refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [user, refreshInterval]);

  // Canvas and Chart Instance References
  const energyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gwCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const devCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const energyChartRef = useRef<any>(null);
  const gwChartRef = useRef<any>(null);
  const devChartRef = useRef<any>(null);

  // 1. Custom Center Text Plugin for Doughnut Charts
  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw(chart: any) {
      const { ctx, width, height } = chart;
      ctx.save();
      
      // Top Line: "Total"
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b'; // Gray color
      const topTextY = height / 2 - 8;
      ctx.fillText('Total', width / 2, topTextY);

      // Bottom Line: Dynamic total count sum
      ctx.font = 'bold 20px Inter, sans-serif';
      const isDarkMode = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDarkMode ? '#f8fafc' : '#0f172a'; // Bold, larger font
      const bottomTextY = height / 2 + 10;
      
      const total = chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
      ctx.fillText(String(total), width / 2, bottomTextY);
      ctx.restore();
    }
  };

  // 2. High-Performance Update (updateCharts)
  const updateCharts = (chart: any, labels: string[], gen: (number | null)[], used: (number | null)[]) => {
    chart.data.labels = labels;
    chart.data.datasets[0].data = gen;
    chart.data.datasets[1].data = used;
    chart.update('none'); // skip standard animations for smooth, real-time rendering
  };

  // 3. Chart Initialization (renderCharts)
  const renderCharts = (labels: string[], gen: (number | null)[], used: (number | null)[]) => {
    const ctx = energyCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (energyChartRef.current) {
      // If instance exists, update it dynamically using the high-performance method
      updateCharts(energyChartRef.current, labels, gen, used);
    } else {
      // Initialize a new instance
      energyChartRef.current = new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Generation Energy (kWh)',
              data: gen,
              backgroundColor: '#478bf1',
              borderColor: '#3b82f6',
              borderWidth: 1,
              borderRadius: 2,
              barPercentage: 0.8,
              categoryPercentage: 0.8,
            },
            {
              label: 'Used Energy (kWh)',
              data: used,
              backgroundColor: '#fcca46',
              borderColor: '#f59e0b',
              borderWidth: 1,
              borderRadius: 2,
              barPercentage: 0.8,
              categoryPercentage: 0.8,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'center',
              labels: {
                usePointStyle: false,
                boxWidth: 20,
                boxHeight: 12,
                color: '#64748b',
                font: { family: 'Inter', size: 12 }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: '#0f172a',
              titleFont: { size: 11, family: 'Inter', weight: 'bold' },
              bodyFont: { size: 11, family: 'Inter' },
              padding: 10,
              cornerRadius: 8,
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(148, 163, 184, 0.06)' },
              ticks: { color: '#64748b', font: { size: 10, family: 'Inter' } }
            },
            x: {
              grid: { display: true, color: 'rgba(148, 163, 184, 0.15)', tickColor: 'transparent' },
              ticks: { color: '#64748b', font: { size: 10, family: 'Inter' } }
            }
          }
        }
      });
    }
  };

  const renderGwChart = (online: number, offline: number, never: number) => {
    const ctx = gwCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    const dataValues = [online, offline, never];

    if (gwChartRef.current) {
      gwChartRef.current.data.datasets[0].data = dataValues;
      gwChartRef.current.update('none');
    } else {
      gwChartRef.current = new ChartJS(ctx, {
        type: 'doughnut',
        plugins: [centerTextPlugin],
        data: {
          labels: ['Online', 'Offline', 'Never Seen'],
          datasets: [{
            data: dataValues,
            backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
          }
        }
      });
    }
  };

  const renderDevChart = (online: number, offline: number, never: number) => {
    const ctx = devCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    const dataValues = [online, offline, never];

    if (devChartRef.current) {
      devChartRef.current.data.datasets[0].data = dataValues;
      devChartRef.current.update('none');
    } else {
      devChartRef.current = new ChartJS(ctx, {
        type: 'doughnut',
        plugins: [centerTextPlugin],
        data: {
          labels: ['Online', 'Offline', 'Never Seen'],
          datasets: [{
            data: dataValues,
            backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
          }
        }
      });
    }
  };

  // Synchronizers and cleanups
  useEffect(() => {
    if (energySummary.labels.length > 0) {
      renderCharts(energySummary.labels, energySummary.gen, energySummary.used);
    }
  }, [energySummary]);

  useEffect(() => {
    renderGwChart(stats.gwStatus.online, stats.gwStatus.offline, stats.gwStatus.never);
  }, [stats.gwStatus, stats.gateways]);

  useEffect(() => {
    renderDevChart(stats.devStatus.online, stats.devStatus.offline, stats.devStatus.never);
  }, [stats.devStatus, stats.devices]);

  useEffect(() => {
    return () => {
      if (energyChartRef.current) {
        energyChartRef.current.destroy();
        energyChartRef.current = null;
      }
      if (gwChartRef.current) {
        gwChartRef.current.destroy();
        gwChartRef.current = null;
      }
      if (devChartRef.current) {
        devChartRef.current.destroy();
        devChartRef.current = null;
      }
    };
  }, []);

  // Status Chart Data helper
  const exportMapData = () => {
    if (devices.length === 0) {
      alert("No device data available to export.");
      return;
    }

    const headers = ['Name', 'DevEUI', 'Status', 'Battery SOC', 'Battery Voltage', 'Latitude', 'Longitude', 'Last Seen'];
    const rows = devices.map(device => {
      const isOnline = device.lastSeenAt && (Date.now() - new Date(device.lastSeenAt).getTime()) / 3600000 <= 1;
      const status = isOnline ? 'Online' : 'Offline';
      const lat = device.latitude ?? device.variables?.latitude ?? 'N/A';
      const lng = device.longitude ?? device.variables?.longitude ?? 'N/A';
      
      return [
        device.name,
        device.devEui,
        status,
        device.variables?.batterySoc ?? 'N/A',
        device.variables?.batteryVoltage?.toFixed(1) ?? 'N/A',
        lat,
        lng,
        device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `device_locations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBrightnessCommand = async (devEui: string, brightnessLevel: number) => {
    try {
      await api.post(`/solar-street-lights/${devEui}/brightness`, {
        brightnessLevel,
        duration: 60
      });

      if (brightnessLevel > 0) {
        // Record override start
        recordTestStart([devEui], brightnessLevel, 3600, 'Dashboard Command', 'on');
      } else {
        // Stop active overrides
        recordTestStop([devEui]);
      }

      alert(`Command sent to ${devEui} to set brightness ${brightnessLevel}%`);
    } catch (err: any) {
      alert(`Error sending command: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Overview</h1>
          {refreshInterval !== null && (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-blue-500/10 dark:bg-blue-500/15 rounded-lg text-[9px] text-blue-600 dark:text-blue-400 font-bold border border-blue-200/50 dark:border-blue-900/30">
              <RefreshCcw className={cn("w-2.5 h-2.5 text-blue-500", isRefreshing && "animate-spin")} />
              <span>Auto-refreshing ({refreshInterval >= 60 ? `${refreshInterval / 60}m` : `${refreshInterval}s`})</span>
            </div>
          )}
        </div>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-sm">
           <button onClick={() => setRefreshInterval(null)} className={cn("px-2.5 py-1 text-[11px] font-bold transition-colors", refreshInterval === null ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}>Off</button>
           <button onClick={() => setRefreshInterval(120)} className={cn("px-2.5 py-1 text-[11px] font-bold transition-colors", refreshInterval === 120 ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}>2m</button>
           <button onClick={() => setRefreshInterval(60)} className={cn("px-2.5 py-1 text-[11px] font-bold transition-colors", refreshInterval === 60 ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}>1m</button>
           <button onClick={() => setRefreshInterval(30)} className={cn("px-2.5 py-1 text-[11px] font-bold transition-colors", refreshInterval === 30 ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}>30s</button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Gateways */}
        <div className="card p-3 sm:p-4 group hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex justify-between items-start mb-1 sm:mb-2 text-wrap min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 truncate uppercase tracking-wider">Total Gateways</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-none">{stats.gateways}</h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-green-50 dark:bg-green-900/10 rounded-lg sm:rounded-xl text-green-600 shrink-0 ml-1">
              <Wifi className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <Link to="/gateways" className="flex items-center space-x-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10 dark:text-blue-400 rounded-md sm:rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/25 transition-colors w-min whitespace-nowrap mt-1">
            <span>Details</span>
            <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </Link>
        </div>

        {/* Total Devices */}
        <div className="card p-3 sm:p-4 group hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex justify-between items-start mb-1 sm:mb-2 text-wrap min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 truncate uppercase tracking-wider">Total Devices</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-none">{stats.devices}</h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg sm:rounded-xl text-blue-600 shrink-0 ml-1">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <Link to="/devices" className="flex items-center space-x-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10 dark:text-blue-400 rounded-md sm:rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/25 transition-colors w-min whitespace-nowrap mt-1">
            <span>Details</span>
            <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </Link>
        </div>

        {/* Solar Generation */}
        <div className="card p-3 sm:p-4 group hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex justify-between items-start mb-1 sm:mb-2 text-wrap min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 truncate uppercase tracking-wider">Solar Gen</p>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white leading-none whitespace-nowrap">
                {stats.generated.toFixed(3)} <span className="text-[9px] sm:text-xs font-normal text-slate-400">kWh</span>
              </h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg sm:rounded-xl text-purple-600 shrink-0 ml-1">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center space-x-1 text-[8px] sm:text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-tight truncate">
              <Leaf className="w-2.5 h-2.5 text-green-500 shrink-0" />
              <span className="truncate">Saved: ~{(stats.generated * 0.399).toFixed(3)}kg</span>
            </div>
            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: '45%' }} />
            </div>
          </div>
        </div>

        {/* Used Energy */}
        <div className="card p-3 sm:p-4 group hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex justify-between items-start mb-1 sm:mb-2 text-wrap min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 truncate uppercase tracking-wider">Used Energy</p>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white leading-none whitespace-nowrap">
                {stats.used.toFixed(3)} <span className="text-[9px] sm:text-xs font-normal text-slate-400">kWh</span>
              </h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg sm:rounded-xl text-orange-600 shrink-0 ml-1">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center space-x-1 text-[8px] sm:text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tight truncate">
              <Zap className="w-2.5 h-2.5 text-orange-500 shrink-0" />
              <span className="truncate">Net: ~{(stats.generated - stats.used).toFixed(3)}kWh</span>
            </div>
            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Energy Chart & Status charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 card p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Energy Chart</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Monthly generation energy and used energy</p>
            </div>
          </div>
          <div className="flex-1 min-h-[220px] relative">
            <canvas ref={energyCanvasRef} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Active Gateways Component */}
          <div className="card p-4 flex-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Active Gateways (จำนวนเกตเวย์)</h3>
            <div className="h-28 relative">
              <canvas ref={gwCanvasRef} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
                 <div className="text-center">
                    <p className="text-[8px] font-bold text-green-500 uppercase">Online</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stats.gwStatus.online}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[8px] font-bold text-red-500 uppercase">Offline</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stats.gwStatus.offline}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Never Seen</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stats.gwStatus.never}</p>
                 </div>
            </div>
          </div>

          {/* Active Devices Component */}
          <div className="card p-4 flex-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Active Devices (อุปกรณ์ย่อยทั้งหมด)</h3>
            <div className="h-28 relative">
              <canvas ref={devCanvasRef} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
                 <div className="text-center">
                    <p className="text-[8px] font-bold text-green-500 uppercase">Online</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stats.devStatus.online}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[8px] font-bold text-red-500 uppercase">Offline</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stats.devStatus.offline}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Never Seen</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stats.devStatus.never}</p>
                 </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <section className="card p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Street Light Locations</h3>
          <button 
            onClick={exportMapData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all uppercase tracking-wider"
          >
            <Download className="w-3 h-3" />
            <span>Export Map Data</span>
          </button>
        </div>
        <div className="h-80 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
           <DeviceMap devices={devices} gateways={gateways} isLoading={isRefreshing && devices.length === 0} hideDetailButton={true} />
        </div>
      </section>

      {/* Recent Anomalies Identified (ความผิดปกติที่พบล่าสุด) */}
      <section className="card p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-950 dark:text-white uppercase tracking-tight flex items-center space-x-1.5">
              <span>Recent Anomalies Identified (ความผิดปกติที่พบล่าสุด)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Automatic detection of critical batteries, off-grid communication drops, or day-night activation sensor faults</p>
          </div>
          <span className="text-[9px] font-black bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2.5 py-0.5 rounded-full border border-red-100 dark:border-red-900/30 uppercase tracking-wider">
             {alerts.length} Faults Active
          </span>
        </div>

        {/* Desktop/Tablet Table Layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase">Anomalous Element</th>
                <th className="py-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase">Device Name</th>
                <th className="py-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase">Dev EUI</th>
                <th className="py-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase">Fault Cause / Diagnostics</th>
                <th className="py-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase text-center">Severity</th>
                <th className="py-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-105 text-xs">
                    <div className="flex items-center space-x-2">
                       <span className="p-0.5 px-1.5 rounded text-[9px] uppercase bg-red-100/10 dark:bg-red-900/10 text-red-500 border border-red-500/20 font-bold tracking-wider">
                        {alert.type === 'battery' && '🔋 Battery'}
                        {alert.type === 'light_off' && '💡 Lamp Fail'}
                        {alert.type === 'offline' && '📡 Offline'}
                        {alert.type === 'system' && '⚠️ System'}
                      </span>
                      <span>{alert.message}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{alert.deviceName}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <code className="text-[10px] text-slate-500 bg-slate-150 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">{alert.devEui}</code>
                  </td>
                  <td className="py-2.5 px-3 max-w-xs text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {alert.details}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                      alert.severity === 'high' ? "bg-red-100 text-red-700 dark:bg-red-955/40 dark:text-red-400" : "bg-yellow-101 text-yellow-700 dark:bg-yellow-955/40 dark:text-yellow-400"
                    )}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      to={`/devices/${alert.devEui}`}
                      className="inline-flex items-center space-x-1 px-2 py-1 text-blue-600 hover:underline dark:text-blue-400 transition-colors text-[10px] font-bold uppercase tracking-wider"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Compact Card List Layout */}
        <div className="block md:hidden space-y-3">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-2.5"
            >
              <div className="flex justify-between items-center">
                <span className="p-0.5 px-1.5 rounded text-[8px] sm:text-[9px] uppercase bg-red-100/10 dark:bg-red-900/10 text-red-500 border border-red-500/20 font-bold tracking-wider">
                  {alert.type === 'battery' && '🔋 Battery'}
                  {alert.type === 'light_off' && '💡 Lamp Fail'}
                  {alert.type === 'offline' && '📡 Offline'}
                  {alert.type === 'system' && '⚠️ System'}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                  alert.severity === 'high' ? "bg-red-105 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-yellow-105 text-yellow-700 dark:bg-yellow-955/40 dark:text-yellow-400"
                )}>
                  {alert.severity}
                </span>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{alert.message}</h4>
                <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-slate-500 font-medium">
                  <span className="font-semibold text-slate-650 dark:text-slate-400">{alert.deviceName}</span>
                  <span>•</span>
                  <code className="bg-slate-200/50 dark:bg-slate-805 px-1 py-0.2 rounded text-[9px] font-mono select-all">{alert.devEui}</code>
                </div>
              </div>
              
              <p className="text-[11px] text-slate-500 leading-normal">{alert.details}</p>
              
              <div className="pt-1 flex justify-end border-t border-slate-200/60 dark:border-slate-802">
                <Link
                  to={`/devices/${alert.devEui}`}
                  className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider py-1"
                >
                  <span>Investigate</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {alerts.length === 0 && (
          <div className="py-8 text-center text-slate-400 text-xs">
            <div className="flex flex-col items-center justify-center space-y-1.5">
               <Activity className="w-8 h-8 text-emerald-500 animate-pulse" />
               <p className="font-bold text-slate-700 dark:text-slate-350">All Street Lamps Operating Correctly</p>
               <p className="text-[9px] text-slate-550 uppercase tracking-widest max-w-lg leading-relaxed px-4">No low solar batteries, off-grid communication drops, or day-night activation failure anomalies identified.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
