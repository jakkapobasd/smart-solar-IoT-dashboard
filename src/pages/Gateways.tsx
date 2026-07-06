import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { 
  Wifi, 
  Radio, 
  Activity,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { cn } from '../lib/utils';

interface LeafletOverlayProps {
  map: L.Map;
  lng: number;
  lat: number;
  onClick?: () => void;
  children: React.ReactNode;
  positioning?: string;
  offset?: [number, number];
  stopEvent?: boolean;
}

const LeafletOverlay: React.FC<LeafletOverlayProps> = ({
  map,
  lng,
  lat,
  onClick,
  children,
  positioning = 'center-center',
  offset = [0, 0],
  stopEvent = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    
    // Setup clicking
    const clickHandler = (e: MouseEvent) => {
      if (onClick) {
        e.stopPropagation();
        onClick();
      }
    };
    el.addEventListener('click', clickHandler);

    el.style.position = 'absolute';
    if (positioning === 'bottom-center') {
      el.style.transform = `translate(-50%, -100%) translateY(${offset[1]}px) translateX(${offset[0]}px)`;
    } else {
      el.style.transform = `translate(-50%, -50%) translateY(${offset[1]}px) translateX(${offset[0]}px)`;
    }

    const customIcon = L.divIcon({
      html: el,
      className: '',
      iconSize: [0, 0],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    markerRef.current = marker;

    return () => {
      el.removeEventListener('click', clickHandler);
      if (markerRef.current) {
        try {
          markerRef.current.remove();
        } catch (e) {
          console.warn("Leaflet marker removal failed in Gateways:", e);
        }
      }
    };
  }, [map, onClick, positioning, offset[0], offset[1], stopEvent]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  return createPortal(children, containerRef.current);
};

function formatThaiDate(dateString: string | undefined | null): string {
  if (!dateString) return 'Never';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Never';
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  } catch (e) {
    return 'Never';
  }
}

const GatewayMapComp: React.FC<{ gateways: any[]; center: [number, number] }> = ({ gateways, center }) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [activeGateway, setActiveGateway] = useState<any | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      maxZoom: 20
    }).setView([center[0], center[1]], 11);

    L.tileLayer(tileUrl, {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 20,
      maxNativeZoom: 19
    }).addTo(map);

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

  const hasCenteredRef = useRef(false);
  useEffect(() => {
    if (mapInstance && center && !hasCenteredRef.current && center[0] !== 13.0076) {
      mapInstance.setView([center[0], center[1]], 11);
      hasCenteredRef.current = true;
    }
  }, [mapInstance, center]);

  const closePopup = () => {
    setActiveGateway(null);
  };

  return (
    <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '300px' }}>
      {mapInstance && (
        <>
          {gateways.map((gw, idx) => (
            <LeafletOverlay
              key={gw.id || `gw-${idx}`}
              map={mapInstance}
              lng={gw.lng}
              lat={gw.lat}
              onClick={() => setActiveGateway(gw)}
            >
              <div className={cn("w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform", (gw.state === 'ONLINE' || gw.status === 'ONLINE') ? 'bg-emerald-500' : 'bg-red-500')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                  <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                  <line x1="12" y1="20" x2="12.01" y2="20"></line>
                </svg>
              </div>
            </LeafletOverlay>
          ))}

          {activeGateway && (
            <LeafletOverlay
              map={mapInstance}
              lng={activeGateway.lng}
              lat={activeGateway.lat}
              positioning="bottom-center"
              offset={[0, -15]}
              stopEvent={true}
            >
              <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 sm:p-5 text-slate-700 dark:text-slate-200 min-w-[285px] max-w-[340px] leading-relaxed dark:text-slate-100 z-50 text-left">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closePopup();
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 font-bold p-1 cursor-pointer leading-none text-[15px]"
                >
                  ✕
                </button>
                <div className="flex items-center justify-between gap-4 mb-2 pr-4">
                  <h4 className="font-extrabold text-[#0f172a] dark:text-white leading-none text-sm">
                    {activeGateway.name || 'GW-WHA-ES4-001'}
                  </h4>
                  <span className={cn(
                    "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full select-none tracking-wide",
                    (activeGateway.state === 'ONLINE' || activeGateway.status === 'ONLINE' || activeGateway.state === 'online')
                      ? "bg-[#e2f9ec] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                  )}>
                    {(activeGateway.state === 'ONLINE' || activeGateway.status === 'ONLINE' || activeGateway.state === 'online') ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-350">
                  <p className="leading-normal">
                    <span className="font-semibold text-slate-900 dark:text-white">ID:</span> <span className="font-sans">{activeGateway.gatewayId || activeGateway.id}</span>
                  </p>
                  <p className="leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white">Description:</span> {activeGateway.description || 'UG67 LoRaWAN Gateway (Outdoor), WHA ESIE-4'}
                  </p>
                  <p className="leading-normal">
                    <span className="font-semibold text-slate-900 dark:text-white">Last Seen:</span> <span className="font-sans">{formatThaiDate(activeGateway.lastSeenAt)}</span>
                  </p>
                </div>
                {/* Speech bubble pointer arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 rotate-45 -mt-1.5 z-[-1]" />
              </div>
            </LeafletOverlay>
          )}
        </>
      )}
    </div>
  );
};

const Gateways: React.FC = () => {
  const { user } = useAuth();
  const [gateways, setGateways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Gateway Data
  const fetchGateways = async () => {
    if (!user?.tenantId) return;
    try {
      setLoading(true);
      const res = await api.get('/gateways', {
        params: { tenantId: user.tenantId, limit: 100 }
      });
      setGateways(res.data.result || []);
    } catch (error) {
      console.error("Failed to fetch gateways:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
    const interval = setInterval(fetchGateways, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const markers = gateways.map(gw => {
    const lat = gw.location?.latitude || gw.latitude || 13.0076;
    const lng = gw.location?.longitude || gw.longitude || 101.1448; // Defaults to region near Pluak Daeng if missing
    return {
      ...gw,
      lat,
      lng
    };
  });

  const center: [number, number] = markers.length > 0 && markers[0].lat !== undefined
    ? [markers[0].lat, markers[0].lng] 
    : [13.0076, 101.1448];

  const totalGws = gateways.length;
  const onlineGws = gateways.filter(g => g.state === 'ONLINE' || g.status === 'ONLINE').length;
  const offlineGws = totalGws - onlineGws;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1780px] mx-auto">
      
      {/* Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="card flex items-center space-x-4 p-4 sm:p-5 shadow-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-xl">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Gateways</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{totalGws} Units</h4>
          </div>
        </div>

        <div className="card flex items-center space-x-4 p-4 sm:p-5 shadow-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Online</p>
            <h4 className="text-xl font-bold text-emerald-500 leading-tight">{onlineGws} Active</h4>
          </div>
        </div>

        <div className="card flex items-center space-x-4 p-4 sm:p-5 shadow-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-xl">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Offline</p>
            <h4 className="text-xl font-bold text-red-500 leading-tight">{offlineGws} Fault</h4>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="h-72 sm:h-[420px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 card p-0 z-0 shadow-sm relative">
        {loading && gateways.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-[1px] z-10 w-full h-full">
            <div className="w-8 h-8 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-emerald-500 animate-spin" />
          </div>
        )}
        <GatewayMapComp gateways={markers} center={center} />
      </div>

      {/* Gateway List Section */}
      <div className="card p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wider">GATEWAY REGISTRY</h3>
        
        {/* Desktop Table Layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase">
                <th className="py-3 px-4">Gateway Name</th>
                <th className="py-3 px-4">Gateway ID</th>
                <th className="py-3 px-4">Connection State</th>
                <th className="py-3 px-4">Last Communications</th>
              </tr>
            </thead>
            <tbody>
              {gateways.map((gw, idx) => {
                const isOnline = gw.state === 'ONLINE' || gw.status === 'ONLINE';
                const gwId = gw.id || `gw-${idx}`;
                return (
                  <tr key={gwId} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{gw.name || 'LoRa Gateway Node'}</p>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-400">
                      <code>{gw.gatewayId || gw.id}</code>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center space-x-1.5 font-bold">
                        <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                        <span className={isOnline ? "text-emerald-500" : "text-red-500"}>{gw.state || (isOnline ? 'ONLINE' : 'OFFLINE')}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-medium">
                      {gw.lastSeenAt ? new Date(gw.lastSeenAt).toLocaleString() : 'Never Active'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Layout */}
        <div className="block md:hidden space-y-3">
          {gateways.map((gw, idx) => {
            const isOnline = gw.state === 'ONLINE' || gw.status === 'ONLINE';
            const gwId = gw.id || `gw-${idx}`;
            return (
              <div 
                key={gwId}
                className="p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{gw.name || 'LoRa Gateway Node'}</h4>
                    <p className="text-[10px] font-mono text-slate-400 select-all leading-tight mt-0.5">{gw.gatewayId || gw.id}</p>
                  </div>
                  
                  <span className="inline-flex items-center space-x-1 font-bold text-[10px]">
                    <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500" : "bg-red-500")} />
                    <span className={isOnline ? "text-emerald-500" : "text-red-500"}>{gw.state || (isOnline ? 'ONLINE' : 'OFFLINE')}</span>
                  </span>
                </div>
                
                <div className="pt-2 flex justify-between items-center text-[10px] border-t border-slate-200/40 dark:border-slate-800/50 font-medium">
                  <span className="text-slate-400">LAST COMMUNICATIONS:</span>
                  <span className="text-slate-600 dark:text-slate-300 font-bold">{gw.lastSeenAt ? new Date(gw.lastSeenAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never Active'}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {gateways.length === 0 && (
          <div className="py-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            No registered gateways found
          </div>
        )}
      </div>
    </div>
  );
};

export default Gateways;
