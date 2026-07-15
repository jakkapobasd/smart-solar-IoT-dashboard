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
<<<<<<< HEAD
=======
  registerMode: 'manual' | 'project';
>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
  filteredProfileDevices: any[];
  activeDeviceEui: string;
  focusDeviceOnMap: (item: any) => void;
  handleMapClick: (lat: number, lng: number) => void;
  handleBoundsChange: (center: [number, number], zoom: number) => void;
}> = ({
  mapCenter,
  mapZoom,
<<<<<<< HEAD
=======
  registerMode,
>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
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
<<<<<<< HEAD
          <LeafletOverlay
            map={mapInstance}
            lng={mapCenter[1]}
            lat={mapCenter[0]}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow-xl flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
            </div>
          </LeafletOverlay>
=======
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
>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
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

<<<<<<< HEAD
=======
  // Tabs: 'manual' (Traditional Form Setup) or 'project' (Auto Import from pre-configured lists)
  const registerMode = 'manual';

>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
  // Metadata arrays
  const [groups, setGroups] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [existingDevEuis, setExistingDevEuis] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deviceProfiles, setDeviceProfiles] = useState<any[]>([]);

<<<<<<< HEAD
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
=======
  // States for "Import from Profile" mode
  const [allAppDevices, setAllAppDevices] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [profileDevices, setProfileDevices] = useState<any[]>([]);
  const [loadingProfileDevices, setLoadingProfileDevices] = useState(false);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
  const [selectedProjDevices, setSelectedProjDevices] = useState<string[]>([]); // Selected DevEUIs
  const [activeDeviceEui, setActiveDeviceEui] = useState<string>('');
  const [hideRegistered, setHideRegistered] = useState<boolean>(true);
>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640

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
<<<<<<< HEAD
      const allDevicesList = allDevsRes.data.result || [];
=======
      setGroups(groupRes.data.result || []);
      setGateways(gwRes.data.result || []);
      const allDevicesList = allDevsRes.data.result || [];
      setAllAppDevices(allDevicesList);
>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
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

  // Handle Map Click coordinate updates
  const handleMapClick = (lat: number, lng: number) => {
    if (!canManage) return;
    const latFixed = parseFloat(lat.toFixed(6));
    const lngFixed = parseFloat(lng.toFixed(6));

<<<<<<< HEAD
=======
    if (registerMode === 'project' && activeDeviceEui) {
      setProfileDevices(prev =>
        prev.map(d => d.devEui === activeDeviceEui ? { ...d, latitude: latFixed, longitude: lngFixed } : d)
      );
    }

>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
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

  // Map focus micro-interactions
  const focusDeviceOnMap = (device: any) => {
<<<<<<< HEAD
=======
    setActiveDeviceEui(device.devEui);
>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
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

<<<<<<< HEAD
=======
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

>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
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

            {/* MODE 2: FORM SETUP MANUAL REGISTRATION */}
<<<<<<< HEAD
              <form onSubmit={handleManualSubmit} className="space-y-4 flex flex-col justify-between h-full">
=======
            <form onSubmit={handleManualSubmit} className="space-y-4 flex flex-col justify-between h-full">
>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
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
<<<<<<< HEAD
              </form>
=======
            </form>
>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
          </div>
        </div>

        {/* Map Column */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="card w-full p-0 flex flex-col h-full justify-between overflow-hidden shadow-sm">
            <div className="p-6 pb-3 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
              <div>
                <h3 className="text-[17px] font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />แผนที่ตำแหน่ง (Installation Map)
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">คลิกบนแผนที่เพื่อกำหนดพิกัด</p>
              </div>
              
              {/* Reset to current position tool */}
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
            </div>

            {/* Interactive Map Container */}
            <div className="flex-1 min-h-[500px] lg:min-h-[620px] relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm z-0">
              <AddDeviceMapComp
                mapCenter={mapCenter}
                mapZoom={mapZoom}
<<<<<<< HEAD
                filteredProfileDevices={[]}
                activeDeviceEui={''}
=======
                registerMode={registerMode}
                filteredProfileDevices={filteredProfileDevices}
                activeDeviceEui={activeDeviceEui}
>>>>>>> 0996af7bdbdbc4e0cac0399586f5bea08195d640
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
