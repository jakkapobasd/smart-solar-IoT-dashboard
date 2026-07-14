import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { 
  Lock, 
  Cpu, 
  MapPin, 
  Layers, 
  Database, 
  CheckCircle2, 
  XCircle, 
  Compass, 
  ArrowLeft,
  Building2,
  FolderDown,
  Search,
  Check,
  Zap,
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import DeviceService from '../services/DeviceService';

interface LeafletOverlayProps {
  map: L.Map;
  lng: number;
  lat: number;
  onClick?: () => void;
  children: React.ReactNode;
}

const LeafletOverlay: React.FC<LeafletOverlayProps> = ({ map, lng, lat, onClick, children }) => {
  const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    
    const clickHandler = (e: MouseEvent) => {
      if (onClick) {
        e.stopPropagation();
        onClick();
      }
    };

    el.addEventListener('click', clickHandler);

    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -50%)';

    const customIcon = L.divIcon({
      html: el,
      className: '',
      iconSize: [0, 0]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    markerRef.current = marker;

    return () => {
      el.removeEventListener('click', clickHandler);
      if (markerRef.current) {
        // Failsafe cleanup
        try {
          if ((markerRef.current as any)._map) {
            markerRef.current.remove();
          }
        } catch (e) {
          // Ignore errors on cleanup as map might be gone already.
        }
      }
    };
  }, [map, onClick, lng, lat]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lng, lat]);

  return createPortal(children, containerRef.current);
};

const AddDeviceMapComp: React.FC<{
  mapCenter: [number, number];
  mapZoom: number;
  registerMode: 'manual' | 'project';
  filteredProfileDevices: any[];
  activeDeviceEui: string;
  focusDeviceOnMap: (item: any) => void;
  handleMapClick: (lat: number, lng: number) => void;
  handleBoundsChange: (center: [number, number], zoom: number) => void;
}> = ({
  mapCenter,
  mapZoom,
  registerMode,
  filteredProfileDevices,
  activeDeviceEui,
  focusDeviceOnMap,
  handleMapClick,
  handleBoundsChange
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      maxZoom: 20
    }).setView([mapCenter[0], mapCenter[1]], mapZoom);

    L.tileLayer(tileUrl, {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 20,
      maxNativeZoom: 19
    }).addTo(map);

    map.on('click', (evt: L.LeafletMouseEvent) => {
      const latlng = evt.latlng;
      if (latlng) {
        handleMapClick(latlng.lat, latlng.lng);
      }
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (center && zoom !== undefined) {
        handleBoundsChange([center.lat, center.lng], zoom);
      }
    });

    mapRef.current = map;
    setMapInstance(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, []);

  // Sync center and zoom shifts from props (e.g. when typing coords or selecting project item)
  useEffect(() => {
    if (mapInstance) {
      const center = mapInstance.getCenter();
      const dLat = Math.abs(center.lat - mapCenter[0]);
      const dLng = Math.abs(center.lng - mapCenter[1]);
      if (dLat > 0.0001 || dLng > 0.0001) {
        mapInstance.setView([mapCenter[0], mapCenter[1]], mapInstance.getZoom());
      }
    }
  }, [mapCenter, mapInstance]);

  return (
    <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '500px' }}>
      {mapInstance && (
        <>
          {registerMode === 'project' ? (
            filteredProfileDevices.map((item, index) => {
              const isSelected = activeDeviceEui === item.devEui;
              return (
                <LeafletOverlay
                  key={item.devEui || index}
                  map={mapInstance}
                  lng={item.longitude || 100.5018}
                  lat={item.latitude || 13.7563}
                  onClick={() => focusDeviceOnMap(item)}
                >
                  <div className={cn("relative flex items-center justify-center transition-all cursor-pointer", isSelected ? 'scale-125' : 'hover:scale-110')}>
                    <span className={cn("absolute p-4 rounded-full", isSelected ? 'bg-blue-500/30 animate-pulse' : 'bg-transparent')}></span>
                    <svg className="w-8 h-10 drop-shadow-md" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 0C8.06 0 0 8.06 0 18c0 14 18 28 18 28s18-14 18-28c0-9.94-8.06-18-18-18z" fill={isSelected ? '#1e3a8a' : '#475569'} />
                      <path d="M18 1.5C9.44 1.5 2.5 8.44 2.5 18c0 12.3 15.5 25.4 15.5 25.4S33.5 30.3 33.5 18C33.5 8.44 26.56 1.5 18 1.5z" fill={isSelected ? '#3b82f6' : '#94a3b8'} />
                      <circle cx="18" cy="18" r="6" fill="#ffffff" />
                    </svg>
                  </div>
                </LeafletOverlay>
              );
            })
          ) : (
            <LeafletOverlay
              map={mapInstance}
              lng={mapCenter[1]}
              lat={mapCenter[0]}
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow-xl flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
              </div>
            </LeafletOverlay>
          )}
        </>
      )}
    </div>
  );
};

const AddDevice: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Checking permissions: Only super admin or tenant admin can manage
  const canManage = !!(user?.isAdmin || user?.isTenantAdmin);

  // Tabs: 'manual' (Traditional Form Setup) or 'project' (Auto Import from pre-configured lists)
  const [registerMode, setRegisterMode] = useState<'manual' | 'project'>('project');

  // Metadata arrays
  const [groups, setGroups] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [existingDevEuis, setExistingDevEuis] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
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
    return "00000000-0000-0000-0000-000000000000"; // realistic default fallback UUID
  };

  // States for "Import from Profile" mode
  const [allAppDevices, setAllAppDevices] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [profileDevices, setProfileDevices] = useState<any[]>([]);
  const [loadingProfileDevices, setLoadingProfileDevices] = useState(false);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
  const [selectedProjDevices, setSelectedProjDevices] = useState<string[]>([]); // Selected DevEUIs
  const [activeDeviceEui, setActiveDeviceEui] = useState<string>('');
  const [hideRegistered, setHideRegistered] = useState<boolean>(true);

  // Form State for manual registration
  const [formData, setFormData] = useState({
    deviceProfile: 'LED Solar Street Light Profile',
    devEui: '',
    appKey: '00000000000000000000000000000000',
    name: '',
    latitude: 13.7563,
    longitude: 100.5018,
    description: '',
    note: '',
    multicastGroupId: '',
    gatewayId: ''
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]);
  const [mapZoom, setMapZoom] = useState(13);

  const handleBoundsChange = (center: [number, number], zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch groups and gateways & local active devices
  const fetchLocalConfigsAndDevices = async () => {
    if (!user?.applicationId) return;
    try {
      const [groupRes, gwRes, allDevsRes, profilesRes] = await Promise.all([
        api.get('/multicast-groups', { params: { applicationId: user.applicationId, limit: 100 } }),
        api.get('/gateways', { params: { tenantId: user.tenantId, limit: 100 } }),
        api.get('/devices', { params: { applicationId: user.applicationId, limit: 500 } }),
        user.tenantId ? DeviceService.getDeviceProfiles(user.tenantId, 100) : Promise.resolve({ data: { result: [] } })
      ]);
      setGroups(groupRes.data.result || []);
      setGateways(gwRes.data.result || []);
      const allDevicesList = allDevsRes.data.result || [];
      setAllAppDevices(allDevicesList);
      setExistingDevEuis(new Set(allDevicesList.map((d: any) => d.devEui)));
      const profiles = profilesRes?.data?.result || [];
      setDeviceProfiles(profiles);
      if (profiles.length > 0) {
        setSelectedProfileId(profiles[0].id || profiles[0].deviceProfileId);
        setFormData(prev => ({
          ...prev,
          deviceProfile: profiles[0].name || prev.deviceProfile
        }));
      }
    } catch (err) {
      console.error("Failed to fetch initial configuration or devices", err);
    }
  };

  useEffect(() => {
    fetchLocalConfigsAndDevices();
  }, [user]);

  // Filter devices when a device profile is selected
  useEffect(() => {
    if (!selectedProfileId || !deviceProfiles.length) {
      setProfileDevices([]);
      return;
    }
    setLoadingProfileDevices(true);
    setSelectedProjDevices([]); // Reset selections on profile swap

    const selectedProfile = deviceProfiles.find(p => (p.id || p.deviceProfileId) === selectedProfileId);
    
    if (selectedProfile) {
      const filtered = allAppDevices.filter(d => d.product?.devProfileName === selectedProfile.name);
      setProfileDevices(filtered);
      if (filtered.length > 0) {
        setMapCenter([filtered[0].latitude || 13.7563, filtered[0].longitude || 100.5018]);
      }
    } else {
      setProfileDevices([]);
    }
    setLoadingProfileDevices(false);
  }, [selectedProfileId, deviceProfiles, allAppDevices]);

  // Handle active project device default selection
  useEffect(() => {
    if (registerMode === 'project' && profileDevices.length > 0) {
      const unassigned = profileDevices.find(d => !existingDevEuis.has(d.devEui));
      const deviceToFocus = unassigned || profileDevices[0];
      
      if (deviceToFocus) {
        setActiveDeviceEui(deviceToFocus.devEui);
        setFormData(prev => ({
          ...prev,
          latitude: deviceToFocus.latitude || 13.7563,
          longitude: deviceToFocus.longitude || 100.5018,
          name: deviceToFocus.name,
          devEui: deviceToFocus.devEui,
          appKey: deviceToFocus.appKey
        }));
        setMapCenter([deviceToFocus.latitude || 13.7563, deviceToFocus.longitude || 100.5018]);
      }
    } else {
      setActiveDeviceEui('');
    }
  }, [profileDevices, existingDevEuis, registerMode]);

  // Handle Map Click coordinate updates
  const handleMapClick = (lat: number, lng: number) => {
    if (!canManage) return;
    const latFixed = parseFloat(lat.toFixed(6));
    const lngFixed = parseFloat(lng.toFixed(6));

    if (registerMode === 'project' && activeDeviceEui) {
      setProfileDevices(prev =>
        prev.map(d => d.devEui === activeDeviceEui ? { ...d, latitude: latFixed, longitude: lngFixed } : d)
      );
    }

    setFormData(prev => ({
      ...prev,
      latitude: latFixed,
      longitude: lngFixed
    }));
    setMapCenter([latFixed, lngFixed]);
  };

  // Sync typed coordinates to Map Marker
  const handleLatLongChange = (field: 'latitude' | 'longitude', val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setFormData(prev => ({ ...prev, [field]: num }));
      if (field === 'latitude') {
        setMapCenter([num, formData.longitude]);
      } else {
        setMapCenter([formData.latitude, num]);
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: val }));
    }
  };

  // Manual Creation Submit Hanlder
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      showToast('error', 'ไม่มีสิทธิ์เข้าถึง: คุณไม่ได้อยู่ในเซสชันของผู้ดูแลระบบ (Permission Denied)');
      return;
    }
    if (!user?.applicationId || !user?.tenantId) {
      showToast('error', 'Session attributes are invalid. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      const deviceData = {
        applicationId: user.applicationId,
        tenantId: user.tenantId,
        name: formData.name,
        devEui: formData.devEui.trim(),
        appKey: formData.appKey.trim(),
        description: formData.description,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        enabledClass: 'C',
        deviceProfileId: getProfileId(formData.deviceProfile),
        isDisabled: false,
        skipFcntCheck: true,
        tags: {
          deviceProfile: formData.deviceProfile,
          note: formData.note,
          gatewayId: formData.gatewayId
        }
      };

      await DeviceService.createDevice(deviceData);
      
      // Assign multicast group if chosen
      if (formData.multicastGroupId) {
        await DeviceService.addDeviceToGroup(formData.multicastGroupId, formData.devEui.trim());
      }

      showToast('success', 'ลงทะเบียนอุปกรณ์ LoRaWAN สำเร็จ (Device registered successfully!)');
      setTimeout(() => {
        navigate('/devices');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      showToast('error', err.response?.data?.detail || 'ล้มเหลวในการบันทึกอุปกรณ์ (Failed to save device)');
    } finally {
      setLoading(false);
    }
  };

  // Auto-Project Bulk Import Handler
  const handleBulkImport = async () => {
    if (!canManage) {
      showToast('error', 'คุณไม่มีสิทธิ์ในการแก้ไขหรือลงทะเบียนอุปกรณ์ (Permission Denied)');
      return;
    }
    if (selectedProjDevices.length === 0) {
      showToast('error', 'กรุณาติ๊กเลือกอุปกรณ์ที่ต้องการนำเข้าอย่างน้อย 1 รายการ');
      return;
    }
    if (!user?.applicationId || !user?.tenantId) {
      showToast('error', 'Session attributes are invalid.');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failedCount = 0;

    const selectedProfile = deviceProfiles.find(p => (p.id || p.deviceProfileId) === selectedProfileId);
    if (!selectedProfile) {
        showToast('error', 'Could not find the selected device profile. Please re-select.');
        setLoading(false);
        return;
    }

    for (const devEui of selectedProjDevices) {
      const targetDev = profileDevices.find(d => d.devEui === devEui);
      if (!targetDev) continue;

      const isAlreadyLinked = existingDevEuis.has(targetDev.devEui);

      try {
        if (!isAlreadyLinked) {
          const devicePayload = {
            applicationId: user.applicationId,
            tenantId: user.tenantId,
            name: targetDev.name,
            devEui: targetDev.devEui.trim(),
            appKey: targetDev.appKey.trim(),
            description: targetDev.description,
            latitude: Number(targetDev.latitude),
            longitude: Number(targetDev.longitude),
            enabledClass: 'C',
            deviceProfileId: selectedProfile.id || selectedProfile.deviceProfileId,
            isDisabled: false,
            skipFcntCheck: true,
            tags: {
              deviceProfile: selectedProfile.name,
              note: `Auto imported from Profile: ${selectedProfile.name || 'Sync'}`
            }
          };

          await DeviceService.createDevice(devicePayload);
        }

        // Assign to multicast group if specified in background configuration
        if (formData.multicastGroupId) {
          try {
            await DeviceService.addDeviceToGroup(formData.multicastGroupId, targetDev.devEui.trim());
          } catch (errGroup) {
            console.warn(`Assign group failed for EUI ${devEui}`, errGroup);
          }
        }

        successCount++;
      } catch (err) {
        console.error(`Failed to register or assign ${devEui}:`, err);
        failedCount++;
      }
    }

    setLoading(false);
    
    // Sync active local list
    await fetchLocalConfigsAndDevices();
    setSelectedProjDevices([]); // Reset checked rows

    if (successCount > 0) {
      showToast('success', `สำเร็จ! นำเข้าแล้ว ${successCount} อุปกรณ์ ${failedCount > 0 ? `(ล้มเหลว ${failedCount})` : ''} เข้าโครงการปฏิบัติงานปัจจุบัน`);
      setTimeout(() => {
        navigate('/devices');
      }, 1500);
    } else {
      showToast('error', 'ไม่สามารถบันทึกอุปกรณ์ได้ เนื่องจากไม่มีข้อมูลหรืออุปกรณ์ลงทะเบียนในระบบเรียบร้อยแล้ว');
    }
  };

  // Checkbox Helper logic
  const toggleSelectDevice = (devEui: string) => {
    setSelectedProjDevices(prev => 
      prev.includes(devEui) ? prev.filter(id => id !== devEui) : [...prev, devEui]
    );
  };

  const toggleSelectAll = (filteredItems: any[]) => {
    const allowedItems = filteredItems.filter(item => !existingDevEuis.has(item.devEui) || !!formData.multicastGroupId);
    const allSelected = allowedItems.every(item => selectedProjDevices.includes(item.devEui));
    
    if (allSelected) {
      const allowedEuis = allowedItems.map(i => i.devEui);
      setSelectedProjDevices(prev => prev.filter(eui => !allowedEuis.includes(eui)));
    } else {
      const allowedEuis = allowedItems.map(i => i.devEui);
      setSelectedProjDevices(prev => Array.from(new Set([...prev, ...allowedEuis])));
    }
  };

  // Map focus micro-interactions
  const focusDeviceOnMap = (device: any) => {
    setActiveDeviceEui(device.devEui);
    setMapCenter([device.latitude, device.longitude]);
    setMapZoom(16);
    // Autofill coordinate inputs too in case user wants to review
    setFormData(prev => ({
      ...prev,
      latitude: device.latitude,
      longitude: device.longitude,
      name: device.name,
      devEui: device.devEui,
      appKey: device.appKey
    }));
  };

  // Filters
  const filteredProfileDevices = profileDevices.filter(d => {
    const matchesSearch = (d.name || '').toLowerCase().includes(deviceSearchTerm.toLowerCase()) || 
                          (d.devEui || '').toLowerCase().includes(deviceSearchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (hideRegistered && existingDevEuis.has(d.devEui)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 relative min-h-screen">
      {/* Toast Alert */}
      {toast && (
        <div className={cn(
          "fixed top-24 right-8 z-[9999] flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300",
          toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* Back link & Title section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/devices')}
            className="inline-flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors mb-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Registered Devices</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Add New Device
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Register individual nodes or sync/link devices rapidly form configured back-office projects.
          </p>
        </div>

        {/* Global Level Indicator Badge */}
        {!canManage && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-amber-500/10 text-amber-500 rounded-full text-xs font-bold border border-amber-500/20">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Viewer Account Read-Only</span>
          </div>
        )}
      </div>

      {/* Segmented Mode Button Toggles */}
      <div className="flex p-1 bg-slate-200/60 dark:bg-slate-900/40 rounded-2xl max-w-2xl border border-slate-200/50 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setRegisterMode('project')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2.5 px-3 sm:px-5 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 pointer-events-auto",
            registerMode === 'project' 
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="text-center leading-tight">ดึงข้อมูลจากโครงการ (Select from Project)</span>
          <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 text-[9px] rounded-full font-black shrink-0">Free</span>
        </button>

        <button
          type="button"
          onClick={() => setRegisterMode('manual')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2.5 px-3 sm:px-5 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 pointer-events-auto",
            registerMode === 'manual' 
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Cpu className="w-4 h-4 shrink-0" />
          <span className="text-center leading-tight">กรอกข้อมูลเอง (Manual Form)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">
        {/* Registration Column */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="card w-full relative flex flex-col h-full justify-between overflow-hidden p-6">
            
            {/* If NO role authority, mount majestic security shield overlay */}
            {!canManage && (
              <div className="absolute inset-0 z-30 bg-slate-100/70 dark:bg-slate-900/85 backdrop-blur-md flex flex-col justify-center items-center text-center p-8 animate-in fade-in duration-300">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 text-red-500 rounded-full flex items-center justify-center shadow-xl border border-slate-200 dark:border-slate-700/50 mb-6 relative">
                  <Lock className="w-9 h-9" />
                  <span className="absolute -bottom-1 -right-1 w-6.5 h-6.5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center leading-none border-2 border-white dark:border-slate-900">!</span>
                </div>
                <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight mb-2">
                  จำกัดการเข้าถึง • Access Restricted
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md leading-relaxed font-semibold mb-6">
                  บัญชีผู้ใช้ของคุณได้รับสิทธิ์ในระดับ <span className="text-red-500 font-extrabold font-mono">Viewer (ผู้เข้าชม)</span> เท่านั้น จึงไม่มีความสามารถในการปรับแต่ง แก้ไข หรือเพิ่มอุปกรณ์ในระบบ LoRaWAN SSL
                </p>
                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-left max-w-md w-full mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Authorized Roles Required:</p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 font-bold space-y-1 pl-1">
                    <li className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">🛡️ Super Admin (ผู้ดูแลระบบกลาง)</li>
                    <li className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">🏢 Tenant Group Admin (แอดมินกลุ่ม)</li>
                  </ul>
                </div>
                <button 
                  onClick={() => navigate('/devices')}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-850 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all"
                >
                  Return to Device List
                </button>
              </div>
            )}

            {/* MODE 1: PROJECT DIRECT IMPORT AND CHECKBOX SELECTION */}
            {registerMode === 'project' && (
              <div className="space-y-6 flex flex-col justify-between h-full">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                      <FolderDown className="w-5 h-5 text-blue-600" />
                      นำเข้าอุปกรณ์จากส่วนกลาง
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      เลือกประเภทอุปกรณ์ (Device Profile) เพื่อแสดงรายการอุปกรณ์ทั้งหมดที่ตรงกันจากในระบบ
                    </p>
                  </div>

                  {/* Device Profile Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        เลือกประเภทอุปกรณ์ (Device Profile)
                      </label>
                      <div className="relative">
                        <select
                          value={selectedProfileId}
                          onChange={e => setSelectedProfileId(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 pr-10 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner appearance-none"
                        >
                          {deviceProfiles.map(p => (
                            <option key={p.id || p.deviceProfileId} value={p.id || p.deviceProfileId}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <Cpu className="absolute right-4 top-4.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Quick filter multicast target */}
                    <div>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        เมื่อนำเข้า ให้จัดเข้ากลุ่ม (Optional)
                      </label>
                      <div className="relative">
                        <select
                          value={formData.multicastGroupId}
                          onChange={e => setFormData({ ...formData, multicastGroupId: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 pr-10 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner appearance-none"
                        >
                          <option value="">มีผลเดี่ยว (ไม่จัดกลุ่ม)</option>
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        <Database className="absolute right-4 top-4.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Device List Section */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/10 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/60">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="h-6 px-2.5 bg-blue-100 dark:bg-blue-950/65 rounded-full text-[10.5px] font-black text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          {filteredProfileDevices.length} Nodes Found
                        </div>
                        
                        {/* Hide Registered Toggle */}
                        <label className="flex items-center space-x-1.5 cursor-pointer bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm hover:ring-1 hover:ring-blue-500/20 transition-all select-none">
                          <input
                            type="checkbox"
                            checked={hideRegistered}
                            onChange={(e) => setHideRegistered(e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 shrink-0 cursor-pointer"
                          />
                          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 tracking-wider">
                            🏠 ซ่อนอุปกรณ์มีบ้าน
                          </span>
                        </label>
                      </div>

                      {/* Micro Search Box */}
                      <div className="relative w-full sm:max-w-[200px]">
                        <input
                          type="text"
                          value={deviceSearchTerm}
                          onChange={e => setDeviceSearchTerm(e.target.value)}
                          placeholder="ค้นหาชื่ออุปกรณ์ / DevEUI..."
                          className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl pl-8 pr-4 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Table Device Listing */}
                    <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-sm max-h-[350px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-black tracking-widest uppercase">
                            <th className="py-4 px-4 w-12 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  filteredProfileDevices.length > 0 &&
                                  filteredProfileDevices
                                    .filter(item => !existingDevEuis.has(item.devEui) || !!formData.multicastGroupId)
                                    .every(item => selectedProjDevices.includes(item.devEui))
                                }
                                onChange={() => toggleSelectAll(filteredProfileDevices)}
                                className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0 transition-all cursor-pointer"
                              />
                            </th>
                            <th className="py-4 px-4">ชื่ออุปกรณ์ / รายละเอียด</th>
                            <th className="py-4 px-4">LoRa Credentials</th>
                            <th className="py-4 px-4 text-center">ตำแหน่ง</th>
                            <th className="py-4 px-4 text-center">สถานะใช้งาน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                          {loadingProfileDevices ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-450">
                                <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 animate-pulse">
                                  <Clock className="w-5 h-5 text-blue-600 animate-spin" />
                                  กำลังดึงรายการอุปกรณ์จากส่วนกลาง...
                                </span>
                              </td>
                            </tr>
                          ) : filteredProfileDevices.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center">
                                <div className="flex flex-col items-center justify-center text-slate-400 py-4">
                                  <HelpCircle className="w-8 h-8 text-slate-300 mb-2" />
                                  <p className="text-sm font-bold text-slate-500">ไม่พบอุปกรณ์ที่ตรงกับประเภทที่เลือก</p>
                                  <p className="text-[11px] text-slate-400 mt-1">กรุณาลองเลือกประเภทอื่น หรือเพิ่มอุปกรณ์ใหม่ในระบบ</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredProfileDevices.map((item, index) => {
                              const isLinked = existingDevEuis.has(item.devEui);
                              const isChecked = selectedProjDevices.includes(item.devEui);
                              const isActive = activeDeviceEui === item.devEui;
                              return (
                                <tr 
                                  key={item.devEui || index} 
                                  className={cn(
                                    "transition-colors hover:bg-slate-55 dark:hover:bg-slate-800/40 cursor-pointer",
                                    isLinked && !formData.multicastGroupId
                                      ? "bg-slate-50/50 dark:bg-slate-950/10 opacity-60 cursor-not-allowed" 
                                      : "",
                                    isActive ? "bg-blue-50/75 dark:bg-blue-950/30 text-blue-600 dark:text-blue-200" : ""
                                  )}
                                  onClick={() => focusDeviceOnMap(item)}
                                >
                                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      disabled={isLinked && !formData.multicastGroupId}
                                      checked={isChecked}
                                      onChange={() => toggleSelectDevice(item.devEui)}
                                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0 transition-all cursor-pointer disabled:cursor-not-allowed"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                      {isActive && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-black">ACTIVE</span>}
                                      <span>{item.name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 font-medium">{item.description}</div>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-[11px]">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-slate-400 text-[10px] font-black">EUI:</span>
                                      <span className="text-slate-700 dark:text-slate-300 font-extrabold">{item.devEui}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 mt-1">
                                      <span className="text-slate-400 text-[10px] font-black">KEY:</span>
                                      <span className="text-slate-400 truncate w-24">{(item.appKey || '').substring(0, 8)}...</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center text-[10px]">
                                    <button 
                                      type="button"
                                      className={cn(
                                        "inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg font-black uppercase text-[9.5px]",
                                        isActive 
                                          ? "bg-blue-600 text-white shadow-sm" 
                                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                                      )}
                                    >
                                      <MapPin className={cn("w-3 h-3", isActive ? "text-white" : "text-red-500")} />
                                      <span>{isActive ? "จัดพิกัดอยู่" : "Focus"}</span>
                                    </button>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {isLinked ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-[10px] font-extrabold">
                                          <Check className="w-3 h-3" />
                                          <span>ลงทะเบียนแล้ว</span>
                                        </span>
                                        {formData.multicastGroupId && (
                                          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">
                                            เพิ่มเข้ากลุ่มได้
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-extrabold animate-pulse">
                                        <Zap className="w-3 h-3" />
                                        <span>พร้อมนำเข้า</span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bulk Guidance Tip helper */}
                  <div className="bg-blue-500/5 rounded-2xl p-4 border border-blue-500/15 flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                      <p className="text-blue-600 dark:text-blue-400 font-black uppercase text-[10px] tracking-wider mb-1">PRO-TIP: ปากกาพู่กัน แผนทีทาสีร่วม</p>
                      เมื่อกดแต่ละคอลัมน์ แผนที่ดาวเทียมด้านขวาจะซูมพุ่งไปยังพื้นที่ติดตั้งทันที เพื่อพิจารณาตำแหน่งใช้งานจริง ก่อนจะนำร่องเชื่อมต่ออุปกรณ์เข้าโครงการ
                    </div>
                  </div>
                </div>

                {/* Import Submission Action footer */}
                <div className="flex space-x-4 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 md:mt-12">
                  <button
                    type="button"
                    onClick={() => navigate('/devices')}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all uppercase text-xs tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={loading || selectedProjDevices.length === 0}
                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl hover:shadow-blue-600/30 transition-all uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? ' sedang mendaftarkan...' : `นำเข้าที่เลือก (${selectedProjDevices.length} อุปกรณ์) 📥`}
                  </button>
                </div>
              </div>
            )}

            {/* MODE 2: FORM SETUP MANUAL REGISTRATION */}
            {registerMode === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                      กรอกข้อมูลลงทะเบียนแบบกำหนดเอง
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">ระบุรายละเอียดอุปกรณ์และจุดติดตั้งพิกัดด่านล่างด้วยตนเอง</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {/* Device Profile Dropdown Selection with Lock badge */}
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 block">
                          Device Profile <span className="text-rose-500 font-black">*</span>
                        </label>
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                          deviceProfiles.length > 0 
                            ? "bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        )}>
                          {deviceProfiles.length > 0 ? "🟢 ลิงก์ข้อมูลอุปกรณ์หลังบ้านเรียบร้อย" : "⚠️ ใช้ค่าประเภทตั้งต้น"}
                        </span>
                      </div>
                      <div className="relative">
                        <select 
                          value={formData.deviceProfile}
                          onChange={e => setFormData({ ...formData, deviceProfile: e.target.value })}
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800/65 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all shadow-sm"
                        >
                          {deviceProfiles && deviceProfiles.length > 0 ? (
                            deviceProfiles.map((p, idx) => (
                              <option key={p.id || p.deviceProfileId || idx} value={p.name}>
                                {p.name}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="LED Solar Street Light Profile">LED Solar Street Light Profile</option>
                              <option value="Smart Photovoltaic Sensor Station">Smart Photovoltaic Sensor Station</option>
                              <option value="Standard Class-C Actuator Model">Standard Class-C Actuator Model</option>
                            </>
                          )}
                        </select>
                        <Layers className="absolute right-3.5 top-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Device EUI (Hex, 16 chars) */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        Device EUI <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formData.devEui} 
                        onChange={e => setFormData({ ...formData, devEui: e.target.value })}
                        required
                        placeholder="70B3D57ED0..."
                        maxLength={16}
                        className="w-full bg-slate-55 dark:bg-slate-800/65 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 ml-1 font-medium">รหัส Hex 16 ตัวอักษร</p>
                    </div>

                    {/* Application Key (Hex, 32 chars) */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        Application Key <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formData.appKey} 
                        onChange={e => setFormData({ ...formData, appKey: e.target.value })}
                        required
                        placeholder="32 Hex characters..."
                        maxLength={32}
                        className="w-full bg-slate-55 dark:bg-slate-800/65 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 ml-1 font-medium">รหัส Hex 32 ตัวอักษร</p>
                    </div>

                    {/* Name field */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        Name / ชื่ออุปกรณ์ <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="ระบุชื่อเรียกอุปกรณ์ เช่น TH-BKK-SSL-01"
                        className="w-full bg-slate-55 dark:bg-slate-800/65 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                      />
                    </div>

                    {/* Latitude and Longitude */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        Latitude / ละติจูด <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input 
                        type="number"
                        step="0.000001"
                        value={formData.latitude} 
                        onChange={e => handleLatLongChange('latitude', e.target.value)}
                        required
                        className="w-full bg-slate-55 dark:bg-slate-800/65 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm block"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        Longitude / ลองจิจูด <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.000001"
                        value={formData.longitude} 
                        onChange={e => handleLatLongChange('longitude', e.target.value)}
                        required
                        className="w-full bg-slate-55 dark:bg-slate-800/65 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm block"
                      />
                    </div>

                    {/* Multicast Group Select Optional */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        Assign Multicast Group / จัดกลุ่มไฟ
                      </label>
                      <div className="relative">
                        <select 
                          value={formData.multicastGroupId} 
                          onChange={e => setFormData({ ...formData, multicastGroupId: e.target.value })}
                          className="w-full bg-slate-55 dark:bg-slate-800/65 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all shadow-sm"
                        >
                          <option value="">No Group Assignment (ไม่จัดเข้ากลุ่ม)</option>
                          {groups.map((g, idx) => (
                            <option key={g.id || idx} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        <Database className="absolute right-3.5 top-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Gateway Select Optional */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        Assigned Gateway / ตัวเชื่อมเครือข่าย
                      </label>
                      <div className="relative">
                        <select 
                          value={formData.gatewayId} 
                          onChange={e => setFormData({ ...formData, gatewayId: e.target.value })}
                          className="w-full bg-slate-55 dark:bg-slate-800/65 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all shadow-sm"
                        >
                          <option value="">Select Gateway (ไม่จำเป็น)</option>
                          {gateways.map((gw, idx) => (
                            <option key={gw.gatewayId || gw.id || idx} value={gw.gatewayId || gw.id}>{gw.name}</option>
                          ))}
                        </select>
                        <Compass className="absolute right-3.5 top-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Description / คำอธิบาย</label>
                      <textarea 
                        value={formData.description} 
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="ระบุคำอธิบายสั้นๆ..."
                        rows={2}
                        className="w-full bg-slate-55 dark:bg-slate-800/65 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                      />
                    </div>

                    {/* Note */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Note / บันทึกเพิ่มเติม</label>
                      <textarea 
                        value={formData.note}
                        onChange={e => setFormData({ ...formData, note: e.target.value })}
                        placeholder="เพิ่มบันทึกสำหรับผู้ติดตั้งหรือช่างไฟ..."
                        rows={2}
                        className="w-full bg-slate-55 dark:bg-slate-800/65 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 select-text">
                  <button
                    type="button"
                    onClick={() => navigate('/devices')}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-all uppercase text-xs tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[1.5] py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-blue-600/25 transition-all uppercase text-xs tracking-wider disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
                  >
                    {loading ? 'Registering...' : 'Register Device 💾'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Map Column */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="card w-full p-0 flex flex-col h-full justify-between overflow-hidden shadow-sm">
            <div className="p-6 pb-3 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
              <div>
                <h3 className="text-[17px] font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  แผนที่ตำแหน่ง (Installation Map)
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">คลิกบนแผนที่เพื่อกักเก็บพิกัด หรือ เลือกแถวอุปกรณ์เพื่อพิกัดเป้าหมาย</p>
              </div>
              
              {/* Reset to current position tool */}
              {registerMode === 'manual' && (
                <button 
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        const lat = parseFloat(pos.coords.latitude.toFixed(6));
                        const lng = parseFloat(pos.coords.longitude.toFixed(6));
                        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                        setMapCenter([lat, lng]);
                        showToast('success', 'ปรับพิกัดค้นหาสำเร็จ (Auto location synchronized!)');
                      }, () => {
                        showToast('error', 'ไม่สามารถค้นพบพิกัดตำแหน่งของคุณได้ในขณะนี้');
                      });
                    } else {
                      showToast('error', 'เบราว์เซอร์ไม่รองรับ API กำหนดตำแหน่ง');
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider dark:bg-blue-950/45 dark:hover:bg-blue-900/50 dark:text-blue-400 transition-colors pointer-events-auto shrink-0"
                >
                  Auto Detect
                </button>
              )}
            </div>

            {/* Interactive Map Container */}
            <div className="flex-1 min-h-[500px] lg:min-h-[620px] relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm z-0">
              <AddDeviceMapComp
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                registerMode={registerMode}
                filteredProfileDevices={filteredProfileDevices}
                activeDeviceEui={activeDeviceEui}
                focusDeviceOnMap={focusDeviceOnMap}
                handleMapClick={handleMapClick}
                handleBoundsChange={handleBoundsChange}
              />
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium z-10">
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 rounded-xl p-3 shadow-inner">
                <div>
                  <span className="font-bold text-slate-400 uppercase mr-1">LAT / พิกัดเหนือ:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{formData.latitude}</span>
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                <div>
                  <span className="font-bold text-slate-400 uppercase mr-1">LNG / พิกัดตะวันออก:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{formData.longitude}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDevice;
