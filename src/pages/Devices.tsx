import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { 
  Search, 
  Plus, 
  RefreshCcw,
  Edit,
  Trash2,
  ChevronDown as ChevronDownIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  Cpu,
  Database,
  Layers,
  Lock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Battery,
  BookOpen,
  Eye,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import DeviceService from '../services/DeviceService';
import DeviceMap from '../components/DeviceMap';

const Devices: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = !!(user?.isAdmin || user?.isTenantAdmin);
  const [devices, setDevices] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [gateways, setGateways] = useState<any[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(120); // Default to 2 minutes
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Online' | 'Offline' | 'NeverSeen'>('All');
  const [focusedCoordinates, setFocusedCoordinates] = useState<[number, number] | null>(null);
  const [focusedDevEui, setFocusedDevEui] = useState<string | null>(null);

  const handleDeviceClick = (device: any) => {
    const lat = device.latitude ?? device.variables?.latitude;
    const lng = device.longitude ?? device.variables?.longitude;
    if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
      setFocusedCoordinates([lat, lng]);
      setFocusedDevEui(device.devEui);
      
      // Scroll smoothly to map section
      const mapElement = document.getElementById('device-map-section');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // Fallback to detail page if no location coordinate exists on map
      navigate(`/devices/${device.devEui}`);
    }
  };

  // Assign Group Devices state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    return localStorage.getItem('lastDevicesGroupId') || '';
  });
  const [groupDevices, setGroupDevices] = useState<any[]>([]);
  const [groupDevicesLoading, setGroupDevicesLoading] = useState(false);

  const fetchGroupDevices = async (groupId: string) => {
    if (!groupId) return;
    setGroupDevicesLoading(true);
    try {
      const res = await api.get('/devices', {
        params: { 
          applicationId: user?.applicationId, 
          multicastGroupId: groupId,
          limit: 100 
        }
      });
      setGroupDevices(res.data.result || []);
    } catch (error) {
      console.error("Fetch group devices error:", error);
    } finally {
      setGroupDevicesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDevices(selectedGroupId);
      localStorage.setItem('lastDevicesGroupId', selectedGroupId);
    } else {
      setGroupDevices([]);
      localStorage.removeItem('lastDevicesGroupId');
    }
  }, [selectedGroupId]);

  const initialGroupSelectRef = React.useRef(false);

  useEffect(() => {
    if (groups.length > 0) {
      const saved = localStorage.getItem('lastDevicesGroupId');
      const matched = groups.find(g => g.id === saved);
      if (matched) {
        setSelectedGroupId(matched.id);
      }
      initialGroupSelectRef.current = true;
    }
  }, [groups]);

  const handleAddDeviceToGroup = async (groupId: string, devEui: string) => {
    try {
      await DeviceService.addDeviceToGroup(groupId, devEui);
      showToast('success', 'เชื่อมต่ออุปกรณ์เข้ากลุ่มสำเร็จ');
      fetchGroupDevices(groupId);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'ไม่สามารถเชื่อมต่ออุปกรณ์เข้ากลุ่มได้');
    }
  };

  const handleRemoveDeviceFromGroup = async (groupId: string, devEui: string) => {
    try {
      await DeviceService.removeDeviceFromGroup(groupId, devEui);
      showToast('success', 'ลบอุปกรณ์ออกจากกลุ่มสำเร็จ');
      fetchGroupDevices(groupId);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'ไม่สามารถลบอุปกรณ์ออกจากกลุ่มได้');
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    devEui: '',
    appKey: '00000000000000000000000000000000',
    description: '',
    latitude: 13.7563,
    longitude: 100.5018,
    enabledClass: 'C',
    multicastGroupId: '',
    gatewayId: '' // We might store this in tags or as a specific variable if the backend supports it
  });

  const [deviceProfiles, setDeviceProfiles] = useState<any[]>([]);

  const getProfileId = (profileName: string): string => {
    const found = deviceProfiles.find(p => 
      p.name?.toLowerCase().includes(profileName.toLowerCase()) || 
      profileName.toLowerCase().includes(p.name?.toLowerCase() || '')
    );
    if (found) {
      return found.id || found.deviceProfileId;
    }
    if (deviceProfiles.length > 0) {
      return deviceProfiles[0].id || deviceProfiles[0].deviceProfileId;
    }
    return "00000000-0000-0000-0000-000000000000";
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    if (!user?.applicationId) return;
    setLoading(true);
    try {
      const [devRes, groupRes, gwRes, profilesRes] = await Promise.all([
        api.get('/devices', { params: { applicationId: user.applicationId, limit: 100 } }),
        api.get('/multicast-groups', { params: { applicationId: user.applicationId, limit: 100 } }),
        api.get('/gateways', { params: { tenantId: user.tenantId, limit: 100 } }),
        user.tenantId ? DeviceService.getDeviceProfiles(user.tenantId, 100) : Promise.resolve({ data: { result: [] } })
      ]);
      
      setDevices(devRes.data.result || []);
      setGroups(groupRes.data.result || []);
      setGateways(gwRes.data.result || []);
      setDeviceProfiles(profilesRes?.data?.result || []);
    } catch (error) {
      console.error("Fetch data error:", error);
      showToast('error', 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (refreshInterval === null) return;
    const interval = setInterval(() => {
      // Don't set loading state during background polls to avoid UI jitter
      if (user?.applicationId) {
        Promise.all([
          api.get('/devices', { params: { applicationId: user.applicationId, limit: 100 } }),
          api.get('/multicast-groups', { params: { applicationId: user.applicationId, limit: 100 } }),
          api.get('/gateways', { params: { tenantId: user.tenantId, limit: 100 } }),
          user.tenantId ? DeviceService.getDeviceProfiles(user.tenantId, 100) : Promise.resolve({ data: { result: [] } })
        ]).then(([devRes, groupRes, gwRes, profilesRes]) => {
          setDevices(devRes.data.result || []);
          setGroups(groupRes.data.result || []);
          setGateways(gwRes.data.result || []);
          setDeviceProfiles(profilesRes?.data?.result || []);
        }).catch(err => console.error("Background poll error", err));
      }
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [user, refreshInterval]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.applicationId || !user?.tenantId) return;

    try {
      const deviceData = {
        applicationId: user.applicationId,
        tenantId: user.tenantId,
        name: formData.name,
        devEui: formData.devEui,
        appKey: formData.appKey,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        enabledClass: formData.enabledClass,
        deviceProfileId: getProfileId('LED Solar Street Light Profile'),
        isDisabled: false,
        skipFcntCheck: true,
        tags: {
          gatewayId: formData.gatewayId
        }
      };

      if (editingDevice) {
        await DeviceService.updateDevice(editingDevice.devEui, deviceData);
        showToast('success', 'Device updated successfully');
      } else {
        await DeviceService.createDevice(deviceData);
        
        // If a group was selected, add the device to that group
        if (formData.multicastGroupId) {
          await DeviceService.addDeviceToGroup(formData.multicastGroupId, formData.devEui);
        }
        
        showToast('success', 'Device registered successfully');
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to save device');
    }
  };

  const handleDelete = async () => {
    if (!deviceToDelete) return;
    try {
      await DeviceService.deleteDevice(deviceToDelete);
      showToast('success', 'Device deleted');
      setIsDeleteModalOpen(false);
      setDeviceToDelete(null);
      fetchData();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to delete device';
      showToast('error', errorMsg);
    }
  };

  const openEditModal = (device: any) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      devEui: device.devEui,
      appKey: device.appKey || '00000000000000000000000000000000',
      description: device.description || '',
      latitude: device.latitude || 13.7563,
      longitude: device.longitude || 100.5018,
      enabledClass: device.enabledClass || 'C',
      multicastGroupId: '', // Groups are many-to-many, so we don't easily edit it here without more logic
      gatewayId: device.tags?.gatewayId || ''
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingDevice(null);
    setFormData({
      name: '',
      devEui: '',
      appKey: '00000000000000000000000000000000',
      description: '',
      latitude: 13.7563,
      longitude: 100.5018,
      enabledClass: 'C',
      multicastGroupId: '',
      gatewayId: ''
    });
    setIsModalOpen(true);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [sortField, setSortField] = useState<'name' | 'status' | 'lastSeenAt' | null>('lastSeenAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: 'name' | 'status' | 'lastSeenAt') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredDevices = devices.filter(d => {
    // If a group is selected, only show devices that belong to that group
    if (selectedGroupId) {
      const isBelongToGroup = groupDevices.some(gd => gd.devEui?.toLowerCase() === d.devEui?.toLowerCase());
      if (!isBelongToGroup) return false;
    }

    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.devEui.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'All') return true;
    
    // Check status
    const hasSeen = !!d.lastSeenAt;
    const isOnline = hasSeen && (Date.now() - new Date(d.lastSeenAt).getTime()) / 3600000 <= 1;
    
    if (statusFilter === 'Online' && isOnline) return true;
    if (statusFilter === 'Offline' && hasSeen && !isOnline) return true;
    if (statusFilter === 'NeverSeen' && !hasSeen) return true;

    return false;
  });

  const sortedDevices = [...filteredDevices].sort((a, b) => {
    if (!sortField) return 0;

    if (sortField === 'name') {
      const aVal = a.name || '';
      const bVal = b.name || '';
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal, 'th', { sensitivity: 'base' }) 
        : bVal.localeCompare(aVal, 'th', { sensitivity: 'base' });
    }

    if (sortField === 'lastSeenAt') {
      const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    }

    if (sortField === 'status') {
      const getStatusRank = (d: any) => {
        const hasSeen = !!d.lastSeenAt;
        if (!hasSeen) return 1; // "NeverSeen"
        const isOnline = (Date.now() - new Date(d.lastSeenAt).getTime()) / 3600000 <= 1;
        return isOnline ? 3 : 2; // "Online" or "Offline"
      };
      const aRank = getStatusRank(a);
      const bRank = getStatusRank(b);
      return sortOrder === 'asc' ? aRank - bRank : bRank - aRank;
    }

    return 0;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredDevices.length / pageSize) || 1;
  const paginatedDevices = sortedDevices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const renderSortHeader = (field: 'name' | 'status' | 'lastSeenAt', label: string) => {
    const isActive = sortField === field;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggleSort(field); }}
        className="flex items-center space-x-1 hover:text-slate-650 dark:hover:text-slate-200 transition-colors focus:outline-none group/sort font-bold uppercase text-[10px] tracking-wider cursor-pointer"
      >
        <span>{label}</span>
        <span className="shrink-0 transition-all duration-200">
          {isActive ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 dark:text-slate-650 group-hover/sort:text-slate-400" />
          )}
        </span>
      </button>
    );
  };

  const formatLastSeen = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const yearBE = d.getFullYear() + 543;
      
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      
      return `${day}/${month}/${yearBE} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      return 'N/A';
    }
  };

  const getProductDisplayName = (device: any) => {
    if (device.product?.name) return device.product.name;
    const base = "BRANCHERS (LED Lamp)";
    if (device.variables?.wattage) {
      return `${base} - ${device.variables.wattage}`;
    }
    if (device.name?.includes("WHA33")) {
      return base;
    }
    return `${base} - 80W`;
  };

  const getDeviceSignalStats = (device: any) => {
    let rssi = device.variables?.rssi ?? device.rssi ?? device.deviceStatus?.rssi;
    let snr = device.variables?.snr ?? device.snr ?? device.deviceStatus?.snr;
    let margin = device.deviceStatusMargin ?? device.deviceStatus?.margin;
    
    if (rssi !== undefined && rssi !== null) {
      rssi = Number(rssi);
      snr = snr !== undefined && snr !== null ? Number(snr) : (margin !== undefined && margin !== null ? Number(margin) - 10 : null);
      return { rssi, snr, margin: margin !== undefined && margin !== null ? Number(margin) : null };
    }
    
    if (margin !== undefined && margin !== null) {
      return { rssi: null, snr: null, margin: Number(margin) };
    }
    
    return { rssi: null, snr: null, margin: null };
  };

  const getSignalDisplay = (device: any) => {
    const { rssi, snr, margin } = getDeviceSignalStats(device);
    if (rssi !== null && snr !== null) return `${rssi} dBm / ${snr} dB`;
    if (rssi !== null) return `${rssi} dBm`;
    if (margin !== null) return `Margin: ${margin} dB`;
    if (snr !== null) return `${snr} dB`;
    return 'N/A';
  };

  const getSignalBadgeColor = (stats: { rssi: number | null, snr: number | null, margin: number | null }) => {
    const { rssi, margin } = stats;
    if (rssi !== null) {
      if (rssi >= -85) return 'text-emerald-600 dark:text-emerald-400 font-bold'; 
      if (rssi >= -102) return 'text-amber-600 dark:text-amber-400 font-bold'; 
      return 'text-rose-600 dark:text-rose-400 font-bold'; 
    }
    if (margin !== null) {
      if (margin >= 10) return 'text-emerald-600 dark:text-emerald-400 font-bold'; 
      if (margin >= 0) return 'text-amber-600 dark:text-amber-400 font-bold'; 
      return 'text-rose-600 dark:text-rose-400 font-bold'; 
    }
    return 'text-slate-400 dark:text-slate-600';
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed top-24 right-8 z-[9999] flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300",
          toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-bold text-sm uppercase tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* Device Map & Details in clean full-width layout */}
      <div id="device-map-section" className="card h-[380px] sm:h-[480px] lg:h-[550px] flex flex-col p-0 overflow-hidden mb-6">
        <div className="p-6 pb-3 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full xl:w-auto">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
              Device Map
            </h2>
            
            {/* Quick Group assignment dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/40 dark:border-slate-700/40 shadow-inner">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">📌 เลือกกรุ๊ปจัดตำแหน่ง:</span>
              <div className="relative">
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="bg-transparent border-none pl-1 pr-6 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 outline-none focus:ring-0 appearance-none cursor-pointer"
                >
                  <option value="">-- ไม่เลือกกลุ่ม --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-0 top-1.5 w-3 h-3 text-slate-450 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end text-xs font-bold text-slate-650 dark:text-slate-300">
            {/* Segmented refresh controls */}
            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-sm shrink-0">
              <button onClick={() => setRefreshInterval(null)} className={cn("px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer", refreshInterval === null ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}>Off</button>
              <button onClick={() => setRefreshInterval(10)} className={cn("px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer", refreshInterval === 10 ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}>10s</button>
              <button onClick={() => setRefreshInterval(30)} className={cn("px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer", refreshInterval === 30 ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}>30s</button>
              <button onClick={() => setRefreshInterval(60)} className={cn("px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer", refreshInterval === 60 ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}>1m</button>
              <button onClick={() => setRefreshInterval(300)} className={cn("px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer", refreshInterval === 300 ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}>5m</button>
            </div>

            {/* Refresh Now Button */}
            <button
              onClick={fetchData}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 px-3 py-1.5 rounded-lg shadow-sm font-semibold text-xs transition-all cursor-pointer shrink-0 text-slate-700 dark:text-slate-200"
            >
              <RefreshCcw className={cn("w-3.5 h-3.5 text-slate-500 dark:text-slate-400", loading && "animate-spin")} />
              <span>Refresh Now</span>
            </button>

            {/* Live Count Indicators */}
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400 border-l border-transparent sm:border-slate-150 sm:dark:border-slate-800/60 pl-0 sm:pl-3.5 shrink-0">
              <span className="tracking-tight">
                Online: <span className="text-emerald-500 dark:text-emerald-450 font-bold">{devices.filter(d => d.lastSeenAt && (Date.now() - new Date(d.lastSeenAt).getTime()) / 3600000 <= 1).length}</span>
              </span>
              <span className="tracking-tight">
                Offline: <span className="text-rose-500 dark:text-rose-450 font-bold">{devices.filter(d => d.lastSeenAt && (Date.now() - new Date(d.lastSeenAt).getTime()) / 3600000 > 1).length}</span>
              </span>
              <span className="tracking-tight">
                Never seen: <span className="text-slate-650 dark:text-slate-300 font-bold">{devices.filter(d => !d.lastSeenAt).length}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1">
           <DeviceMap 
             devices={filteredDevices} 
             selectedGroupId={selectedGroupId}
             groupDevices={groupDevices}
             onAddDeviceToGroup={(groupId, devEui) => handleAddDeviceToGroup(groupId, devEui)}
             onRemoveDeviceFromGroupWithId={(groupId, devEui) => handleRemoveDeviceFromGroup(groupId, devEui)}
             focusedCoordinates={focusedCoordinates}
             focusedDevEui={focusedDevEui}
             isLoading={loading && devices.length === 0}
           />
        </div>
      </div>

      {/* Device Table */}
      <div className="card overflow-hidden">
        <div className="p-5 sm:p-6 bg-slate-50/40 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-850 flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Device List</h2>
            {canManage && (
              <button 
                onClick={() => navigate('/devices/add')}
                className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-blue-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Device</span>
              </button>
            )}
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200 shadow-sm appearance-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="NeverSeen">Never Seen</option>
              </select>
              <ChevronDownIcon className="absolute right-4 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative w-full md:w-80">
               <input 
                type="text" 
                placeholder="Search devices..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200 shadow-sm" 
               />
               <Search className="absolute right-4 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Desktop & Tablet View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="pb-4 px-4 sm:px-6">{renderSortHeader('name', 'NAME')}</th>
                <th className="pb-4 px-4 sm:px-6">DEV EUI</th>
                <th className="pb-4 px-4 sm:px-6 hidden lg:table-cell">PRODUCT NAME</th>
                <th className="pb-4 px-4 sm:px-6">{renderSortHeader('status', 'STATE')}</th>
                <th className="pb-4 px-4 sm:px-6">{renderSortHeader('lastSeenAt', 'LAST SEEN')}</th>
                <th className="pb-4 px-4 sm:px-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {paginatedDevices.map((device) => {
                const isOnline = device.lastSeenAt && (Date.now() - new Date(device.lastSeenAt).getTime()) / 3600000 <= 1;
                const vars = device.variables || {};
                const status = device.deviceStatus || {};
                const soc = vars.batterySoc ?? vars.batteryLevel ?? vars.soc ?? status.batteryLevel ?? status.soc ?? device.soc;
                const batteryVoltage = vars.batteryVoltage ?? status.batteryVoltage ?? device.batteryVoltage;
                const isLowBattery = (soc !== undefined && soc <= 25) || (batteryVoltage !== undefined && (batteryVoltage < 12.0 || (batteryVoltage > 16.0 && batteryVoltage < 23.5)));
                return (
                  <tr 
                    key={device.devEui} 
                    className={cn(
                      "group transition-colors cursor-pointer",
                      isLowBattery 
                        ? "bg-amber-50/40 hover:bg-amber-100/40 dark:bg-amber-950/10 dark:hover:bg-amber-900/10 border-l-4 border-l-amber-500" 
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                    )}
                    onClick={() => handleDeviceClick(device)}
                  >
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "text-sm font-bold transition-colors",
                          isLowBattery 
                            ? "text-amber-800 dark:text-amber-300 group-hover:text-amber-950 dark:group-hover:text-amber-200" 
                            : "text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        )}>
                          {device.name}
                        </span>
                        {isLowBattery && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold border border-amber-300/40 dark:border-amber-800/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>🔋 {soc !== undefined ? `${soc}%` : batteryVoltage !== undefined ? `${batteryVoltage.toFixed(1)}V` : 'Low'}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-mono">
                        {device.devEui}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 hidden lg:table-cell">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {(device.product?.imageUrl || device.imageUrl) ? (
                            <img 
                              src={(device.product?.imageUrl || device.imageUrl).startsWith('http') ? (device.product?.imageUrl || device.imageUrl) : `https://smartsolar-th.com${(device.product?.imageUrl || device.imageUrl).startsWith('/') ? '' : '/'}${device.product?.imageUrl || device.imageUrl}`} 
                              alt={device.product?.imageAlt || device.name} 
                              className="max-w-full max-h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                              <defs>
                                <linearGradient id="bodyGradDevices" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#1e293b" />
                                  <stop offset="100%" stopColor="#334155" />
                                </linearGradient>
                                <linearGradient id="ledGradDevices" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
                                  <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
                                </linearGradient>
                              </defs>

                              {/* Pole Mount/Collar */}
                              <path d="M 80 160 L 80 120 L 92 120 L 92 160 Z" fill="#475569" />
                              <rect x="78" y="152" width="16" height="4" rx="1" fill="#1e293b" />
                              <rect x="78" y="124" width="16" height="4" rx="1" fill="#1e293b" />

                              {/* Joint/Swivel Bracket */}
                              <path d="M 74 120 L 98 120 L 102 104 L 70 104 Z" fill="#334155" />
                              <circle cx="86" cy="112" r="3" fill="#cbd5e1" />

                              {/* Connecting neck to light body */}
                              <path d="M 82 104 L 90 104 L 84 88 L 76 88 Z" fill="#1e293b" />

                              {/* Main Enclosure Body - Slanted up-right */}
                              <path d="M 30 114 L 200 48 M 30 114 L 28 108 L 198 42 L 200 48 Z" fill="#0f172a" />
                              <path d="M 24 106 L 210 32 L 216 42 L 30 116 Z" fill="url(#bodyGradDevices)" stroke="#1e293b" strokeWidth="1" />
                              <path d="M 24 106 L 18 102 L 24 94 L 30 100 Z" fill="#0f172a" />

                              {/* LED Light Section */}
                              <path d="M 130 64 L 190 42 L 196 52 L 136 74 Z" fill="#0f172a" />
                              <path d="M 134 62 L 186 43 L 191 50 L 139 69 Z" fill="url(#ledGradDevices)" stroke="#e2e8f0" strokeWidth="0.5" />
                              
                              {/* LED individual dots */}
                              <circle cx="146" cy="62" r="1.5" fill="#f59e0b" />
                              <circle cx="158" cy="58" r="1.5" fill="#f59e0b" />
                              <circle cx="170" cy="54" r="1.5" fill="#f59e0b" />
                              <circle cx="182" cy="50" r="1.5" fill="#f59e0b" />
                              <circle cx="148" cy="65" r="1.5" fill="#f59e0b" />
                              <circle cx="160" cy="61" r="1.5" fill="#f59e0b" />
                              <circle cx="171" cy="57" r="1.5" fill="#f59e0b" />
                              <circle cx="183" cy="53" r="1.5" fill="#f59e0b" />

                              {/* Solar Panel sliver on top */}
                              <path d="M 40 98 L 195 40 L 194 38 L 39 96 Z" fill="#1e3a8a" opacity="0.8" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-350">
                          {getProductDisplayName(device)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <span className={cn(
                        "px-3 py-1 text-xs font-bold rounded-full inline-block min-w-[70px] text-center",
                        isOnline 
                          ? "bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400" 
                          : "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                      )}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-sans">
                        {formatLastSeen(device.lastSeenAt)}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/devices/${device.devEui}`); }}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); openEditModal(device); }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeviceToDelete(device.devEui); setIsDeleteModalOpen(true); }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-red-600 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {!canManage && (
                          <div className="p-1.5 opacity-60">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDevices.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                       <Search className="w-12 h-12" />
                       <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No devices matched your search</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Card List */}
        <div className="block sm:hidden space-y-4 px-4">
          {paginatedDevices.map((device) => {
            const isOnline = device.lastSeenAt && (Date.now() - new Date(device.lastSeenAt).getTime()) / 3600000 <= 1;
            const vars = device.variables || {};
            const status = device.deviceStatus || {};
            const soc = vars.batterySoc ?? vars.batteryLevel ?? vars.soc ?? status.batteryLevel ?? status.soc ?? device.soc;
            const batteryVoltage = vars.batteryVoltage ?? status.batteryVoltage ?? device.batteryVoltage;
            const isLowBattery = (soc !== undefined && soc <= 25) || (batteryVoltage !== undefined && (batteryVoltage < 12.0 || (batteryVoltage > 16.0 && batteryVoltage < 23.5)));
            return (
              <div 
                key={device.devEui} 
                className={cn(
                  "bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors cursor-pointer",
                  isLowBattery 
                    ? "border-amber-400 dark:border-amber-900 bg-amber-50/10 dark:bg-amber-950/5 ring-1 ring-amber-400/20" 
                    : "border-slate-150 dark:border-slate-800/80"
                )}
                onClick={() => handleDeviceClick(device)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className={cn(
                        "text-sm font-bold transition-colors",
                        isLowBattery ? "text-amber-800 dark:text-amber-300" : "text-slate-800 dark:text-white"
                      )}>
                        {device.name}
                      </span>
                      {isLowBattery && (
                        <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[9px] font-bold border border-amber-300/40 dark:border-amber-800/40 shrink-0 select-none animate-pulse">
                          <span className="w-1 h-1 rounded-full bg-amber-500" />
                          <span>🔋 {soc !== undefined ? `${soc}%` : batteryVoltage !== undefined ? `${batteryVoltage.toFixed(1)}V` : 'Low'}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                      EUI: {device.devEui}
                    </span>
                  </div>
                  <span className={cn(
                    "px-2.5 py-0.5 text-[10px] font-bold rounded-full min-w-[60px] text-center",
                    isOnline 
                      ? "bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400" 
                      : "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                  )}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl mb-3">
                  <div className="w-12 h-10 flex-shrink-0 flex items-center justify-center overflow-hidden bg-white dark:bg-slate-950/30 rounded-lg border border-slate-200/40 dark:border-slate-800/50">
                    {(device.product?.imageUrl || device.imageUrl) ? (
                      <img 
                        src={(device.product?.imageUrl || device.imageUrl).startsWith('http') ? (device.product?.imageUrl || device.imageUrl) : `https://smartsolar-th.com${(device.product?.imageUrl || device.imageUrl).startsWith('/') ? '' : '/'}${device.product?.imageUrl || device.imageUrl}`} 
                        alt={device.product?.imageAlt || device.name} 
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Cpu className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Model</span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-350 line-clamp-1">
                      {getProductDisplayName(device)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 dark:text-slate-450 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                  <div>
                    <span className="text-slate-400 mr-1">Last Seen:</span>
                    <span className="font-sans text-[11px] font-semibold text-slate-600 dark:text-slate-300">{formatLastSeen(device.lastSeenAt)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => navigate(`/devices/${device.devEui}`)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer shadow-sm shadow-blue-500/10 min-h-[34px] flex items-center justify-center transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 duration-75"
                    >
                      Details
                    </button>
                    {canManage ? (
                      <div className="flex items-center space-x-1.5">
                        <button 
                          onClick={() => openEditModal(device)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 rounded-xl transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center border border-slate-100 dark:border-slate-800 cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setDeviceToDelete(device.devEui); setIsDeleteModalOpen(true); }}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-red-600 rounded-xl transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center border border-slate-100 dark:border-slate-800 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center text-slate-400 pl-1">
                        <Lock className="w-3.5 h-3.5 mr-1" />
                        <span className="text-[10px]">Read-only</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredDevices.length === 0 && !loading && (
            <div className="py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-center">
              <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                 <Search className="w-10 h-10" />
                 <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No devices matched your search</p>
              </div>
            </div>
          )}
        </div>

        {/* Elegant Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 gap-4 mt-2">
          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200 font-bold cursor-pointer text-xs"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(prev - 1, 1)); }}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <span className="text-slate-500 dark:text-slate-450 font-bold text-xs px-1">&lt;</span>
            </button>
            <span className="text-sm font-semibold text-slate-650 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(prev + 1, totalPages)); }}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <span className="text-slate-500 dark:text-slate-450 font-bold text-xs px-1">&gt;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-8 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                 <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                  {editingDevice ? 'Edit Device' : 'Register Device'}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Connect your LoRaWAN hardware</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Device Name</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                      placeholder="e.g. SSL-001-Downtown"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Device EUI (Hex)</label>
                    <input 
                      type="text" 
                      value={formData.devEui} 
                      onChange={e => setFormData({...formData, devEui: e.target.value})}
                      required
                      disabled={!!editingDevice}
                      placeholder="16-character hex"
                      maxLength={16}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 shadow-inner disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Application Key (Hex)</label>
                    <input 
                      type="text" 
                      value={formData.appKey} 
                      onChange={e => setFormData({...formData, appKey: e.target.value})}
                      required
                      placeholder="32-character hex"
                      maxLength={32}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Operational Group</label>
                    <div className="relative">
                       <select 
                        value={formData.multicastGroupId} 
                        onChange={e => setFormData({...formData, multicastGroupId: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner"
                      >
                        <option value="">No Group Assignment</option>
                        {groups.map((g, index) => <option key={g.id || index} value={g.id}>{g.name}</option>)}
                      </select>
                      <Layers className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Location Settings</label>
                    <button 
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((position) => {
                            setFormData(prev => ({
                              ...prev,
                              latitude: position.coords.latitude,
                              longitude: position.coords.longitude
                            }));
                            showToast('success', 'Location updated to current position');
                          }, (err) => {
                            showToast('error', 'Failed to get current location');
                          });
                        } else {
                          showToast('error', 'Geolocation is not supported by your browser');
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors flex items-center space-x-1"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Use Current Location</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Latitude</label>
                      <input 
                        type="number" 
                        step="0.000001"
                        value={formData.latitude} 
                        onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Longitude</label>
                      <input 
                        type="number" 
                        step="0.000001"
                        value={formData.longitude} 
                        onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Assigned Gateway</label>
                    <div className="relative">
                       <select 
                        value={formData.gatewayId} 
                        onChange={e => setFormData({...formData, gatewayId: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner"
                      >
                        <option value="">Select Gateway</option>
                        {gateways.map((gw, index) => <option key={gw.gatewayId || gw.id || index} value={gw.gatewayId || gw.id}>{gw.name}</option>)}
                      </select>
                      <Database className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Device Class</label>
                    <div className="grid grid-cols-3 gap-2">
                       {['A', 'B', 'C'].map(c => (
                         <button 
                           key={c}
                           type="button"
                           onClick={() => setFormData({...formData, enabledClass: c})}
                           className={cn(
                             "py-3 rounded-xl text-xs font-bold transition-all border-2",
                             formData.enabledClass === c 
                             ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" 
                             : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-transparent"
                           )}
                         >
                           {c}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Description</label>
                    <textarea 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-2xl hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-5 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] transition-all uppercase text-xs tracking-widest"
                >
                  {editingDevice ? 'Save Changes' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-8 animate-in zoom-in duration-300 border border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-center space-y-2 mb-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Delete Device?</h3>
              <p className="text-sm text-slate-500 font-medium">This will permanently remove the device from your network. This action cannot be undone.</p>
            </div>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={handleDelete}
                className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all uppercase text-xs tracking-widest"
              >
                Permanently Delete
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
              >
                Keep Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Group Devices Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 text-left">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsAssignModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
              จัดการอุปกรณ์ในกลุ่ม (Add / Remove Group Devices)
            </h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">จัดการเชื่อมต่อสำหรับอุปกรณ์ในแอปพลิเคชัน</p>
            
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1.5 block">เลือกกลุ่ม Multicast Group</label>
              <div className="relative">
                <select 
                  value={selectedGroupId} 
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none shadow-sm"
                >
                  <option value="">-- กรุณาเลือกกลุ่ม --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-4 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {selectedGroupId ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 mt-2">
                  {groupDevicesLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-xs font-bold text-slate-400 uppercase">กำลังดึงข้อมูลอุปกรณ์ในกลุ่ม...</p>
                    </div>
                  ) : (
                    devices.map(dev => {
                      const inGroup = groupDevices.some(d => d.devEui?.toLowerCase() === dev.devEui?.toLowerCase());
                      return (
                        <div key={dev.devEui} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{dev.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{dev.devEui}</p>
                          </div>
                          <button 
                            onClick={() => inGroup ? handleRemoveDeviceFromGroup(selectedGroupId, dev.devEui) : handleAddDeviceToGroup(selectedGroupId, dev.devEui)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                              inGroup 
                              ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200/50 dark:border-red-900/50" 
                              : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50"
                            )}
                          >
                            {inGroup ? 'Remove' : 'Add'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-2 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl mt-2">
                <Layers className="w-12 h-12 stroke-[1.5]" />
                <p className="text-sm font-bold uppercase tracking-wide">กรุณาเลือกกลุ่มก่อนจัดการอุปกรณ์</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;
