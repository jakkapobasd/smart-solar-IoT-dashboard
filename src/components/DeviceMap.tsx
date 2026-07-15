import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ChevronDown as ChevronDownIcon } from 'lucide-react';
import L from 'leaflet';
import RainViewerLayer from './RainViewerLayer';

interface Device {
  name: string;
  devEui: string;
  lastSeenAt?: string;
  latitude?: number;
  longitude?: number;
  variables?: {
    latitude?: number;
    longitude?: number;
    batteryLevel?: number;
    batteryVoltage?: number;
    brightnessLevel?: number;
    batterySoc?: number;
    soc?: number;
    battery_level?: number;
    ledCurrent?: number;
    brightness?: number;
  };
  deviceStatus?: {
    batteryLevel?: number;
    batteryVoltage?: number;
    soc?: number;
  };
  soc?: number;
  batteryVoltage?: number;
}

interface DeviceMapProps {
  devices: Device[];
  gateways?: any[];
  groups?: any[];
  focusedCoordinates?: [number, number] | null;
  focusedZoom?: number;
  focusedDevEui?: string | null;
  onRemoveDeviceFromGroup?: (devEui: string) => void;
  selectedGroupId?: string;
  groupDevices?: any[];
  onAddDeviceToGroup?: (groupId: string, devEui: string) => void;
  onRemoveDeviceFromGroupWithId?: (groupId: string, devEui: string) => void;
  isLoading?: boolean;
  hideDetailButton?: boolean;
  showWeatherControls?: boolean;
}

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

interface LeafletOverlayProps {
  map: L.Map;
  lng: number;
  lat: number;
  onClick?: () => void;
  positioning?: 'center-center' | 'bottom-center' | 'top-center' | 'center-left' | 'center-right';
  offset?: [number, number];
  stopEvent?: boolean;
  children: React.ReactNode;
}

// Declarative Overlay wrapper for Leaflet
const LeafletOverlay: React.FC<LeafletOverlayProps> = ({ 
  map, 
  lng, 
  lat, 
  onClick, 
  positioning = 'center-center',
  offset = [0, 0],
  stopEvent = true,
  children 
}) => {
  const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
  const markerRef = useRef<L.Marker | null>(null);

  const cbRef = useRef({ onClick, stopEvent });
  useEffect(() => {
    cbRef.current = { onClick, stopEvent };
  }, [onClick, stopEvent]);

  useEffect(() => {
    const el = containerRef.current;
    el.style.position = 'absolute';
    if (positioning === 'bottom-center') {
      el.style.transform = `translate(-50%, -100%) translateY(${offset[1]}px) translateX(${offset[0]}px)`;
    } else {
      el.style.transform = `translate(-50%, -50%) translateY(${offset[1]}px) translateX(${offset[0]}px)`;
    }

    const customIcon = L.divIcon({
      html: el,
      className: '', // prevent any background or default styles
      iconSize: [0, 0],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    markerRef.current = marker;

    const clickHandler = (e: MouseEvent) => {
      if (cbRef.current.stopEvent) {
        e.stopPropagation();
      }
      if (cbRef.current.onClick) cbRef.current.onClick();
    };

    el.addEventListener('click', clickHandler);

    return () => {
      el.removeEventListener('click', clickHandler);
      if (markerRef.current) {
        try {
          // Failsafe: Check if the marker is still attached to a map before removing.
          if ((markerRef.current as any)._map) {
            markerRef.current.remove();
          }
        } catch (e) {
          // Ignore errors during cleanup as map might be gone already.
        }
      }
    };
  }, [map, positioning, offset[0], offset[1]]);

  // Update position if lat/lng changes
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lng, lat]);

  return createPortal(children, containerRef.current);
};

const DeviceMap: React.FC<DeviceMapProps> = ({
  devices,
  gateways,
  groups,
  focusedCoordinates = null,
  focusedZoom = 17,
  focusedDevEui = null,
  onRemoveDeviceFromGroup,
  selectedGroupId,
  groupDevices,
  onAddDeviceToGroup,
  onRemoveDeviceFromGroupWithId,
  isLoading,
  hideDetailButton,
  showWeatherControls = false,
}) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // States for user interactive coordinates
  const [mapZoom, setMapZoom] = useState<number>(() => {
    if (focusedCoordinates) return focusedZoom;
    try {
      const saved = localStorage.getItem('scada_last_map_zoom');
      if (saved) return parseInt(saved, 10) || 13;
    } catch (e) {}
    return 13;
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    if (focusedCoordinates) return focusedCoordinates;
    try {
      const saved = localStorage.getItem('scada_last_map_center');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2 && typeof parsed[0] === 'number') {
          return parsed as [number, number];
        }
      }
    } catch (e) {}
    return [13.7367, 100.5231]; // Fallback to Bangkok
  });

  // Track currently open popups
  const [activeDeviceEui, setActiveDeviceEui] = useState<string | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [activeGatewayId, setActiveGatewayId] = useState<string | null>(null);
  const [addingToGroupEui, setAddingToGroupEui] = useState<string | null>(null);

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Filter valid device location markers
  const markers = useMemo(() => {
    return devices
      .filter(
        (d) =>
          (d.latitude !== undefined && d.longitude !== undefined) ||
          (d.variables?.latitude !== undefined && d.variables?.longitude !== undefined)
      )
      .map((d) => ({
        ...d,
        lat: d.latitude ?? d.variables?.latitude ?? 0,
        lng: d.longitude ?? d.variables?.longitude ?? 0,
      }));
  }, [devices]);

  // Save coordinates when elements are populated
  useEffect(() => {
    if (markers.length > 0 && !focusedCoordinates) {
      try {
        localStorage.setItem('scada_last_map_center', JSON.stringify([markers[0].lat, markers[0].lng]));
      } catch (e) {}
    }
  }, [markers, focusedCoordinates]);

  // Extract gateways coordinates
  const parsedGateways = useMemo(() => {
    if (!gateways) return [];
    return gateways
      .map((gw) => {
        const lat = gw.location?.latitude ?? gw.latitude;
        const lng = gw.location?.longitude ?? gw.longitude;
        return {
          ...gw,
          lat,
          lng,
        };
      })
      .filter((gw) => gw.lat !== undefined && gw.lng !== undefined);
  }, [gateways]);

  // Handle dynamic camera location centering reactively when devices/gateways became available
  const isLoaded = markers.length > 0 || parsedGateways.length > 0;
  const hasAutoCenteredRef = useRef(false);

  const computedInitialCenter = useMemo<[number, number]>(() => {
    if (focusedCoordinates) return focusedCoordinates;

    if (markers.length > 0) {
      const avgLat = markers.reduce((sum, m) => sum + m.lat, 0) / markers.length;
      const avgLng = markers.reduce((sum, m) => sum + m.lng, 0) / markers.length;
      return [avgLat, avgLng];
    }

    if (parsedGateways.length > 0) {
      const avgLat = parsedGateways.reduce((sum, g) => sum + g.lat, 0) / parsedGateways.length;
      const avgLng = parsedGateways.reduce((sum, g) => sum + g.lng, 0) / parsedGateways.length;
      return [avgLat, avgLng];
    }

    try {
      const saved = localStorage.getItem('scada_last_map_center');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2 && typeof parsed[0] === 'number') {
          return parsed as [number, number];
        }
      }
    } catch (e) {}

    return [13.7367, 100.5231]; // Bangkok fallback
  }, [markers, parsedGateways, focusedCoordinates]);

  const computedInitialZoom = useMemo<number>(() => {
    if (focusedCoordinates) return focusedZoom;
    if (markers.length > 0) return 13;
    if (parsedGateways.length > 0) return 11;
    try {
      const saved = localStorage.getItem('scada_last_map_zoom');
      if (saved) return parseInt(saved, 10) || 12;
    } catch (e) {}
    return 12;
  }, [markers, parsedGateways, focusedCoordinates, focusedZoom]);

  // Initialize Leaflet Map
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

    const onMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (center && zoom !== undefined) {
        const lat = center.lat;
        const lng = center.lng;

        try {
          localStorage.setItem('scada_last_map_center', JSON.stringify([lat, lng]));
          localStorage.setItem('scada_last_map_zoom', zoom.toString());
        } catch (e) {}

        setMapCenter([lat, lng]);
        setMapZoom(zoom);
      }
    };

    map.on('moveend', onMoveEnd);

    mapRef.current = map;
    setMapInstance(map);

    // Initial check for size
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.off('moveend', onMoveEnd);
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, []);

  // Update focus coordinates reactively
  useEffect(() => {
    if (focusedCoordinates && mapRef.current) {
      mapRef.current.setView([focusedCoordinates[0], focusedCoordinates[1]], focusedZoom);
    }
  }, [focusedCoordinates, focusedZoom]);

  // Open focused device popup automatically
  useEffect(() => {
    if (focusedDevEui) {
      setActiveDeviceEui(focusedDevEui);
    }
  }, [focusedDevEui]);

  // Handle initial auto center
  useEffect(() => {
    if (isLoaded && !hasAutoCenteredRef.current && mapRef.current) {
      mapRef.current.setView([computedInitialCenter[0], computedInitialCenter[1]], computedInitialZoom);
      hasAutoCenteredRef.current = true;
    }
  }, [isLoaded, computedInitialCenter, computedInitialZoom]);

  // Greedy Clustering Algorithm
  const clustered = useMemo(() => {
    const MAX_CLUSTER_ZOOM = 13;
    if (mapZoom > MAX_CLUSTER_ZOOM) {
      return markers.map((m) => ({
        ...m,
        isCluster: false,
      }));
    }

    const clusterPixelRadius = 60;
    const radius = (clusterPixelRadius / (256 * Math.pow(2, mapZoom))) * 360;
    const remaining = [...markers];
    const results: any[] = [];

    while (remaining.length > 0) {
      const pivot = remaining[0];
      const closeGroup = remaining.filter((m) => {
        const dLat = m.lat - pivot.lat;
        const dLng = m.lng - pivot.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        return dist < radius;
      });

      if (closeGroup.length > 1) {
        const avgLat = closeGroup.reduce((sum, m) => sum + m.lat, 0) / closeGroup.length;
        const avgLng = closeGroup.reduce((sum, m) => sum + m.lng, 0) / closeGroup.length;

        results.push({
          id: `cluster-${pivot.devEui}`,
          isCluster: true,
          lat: avgLat,
          lng: avgLng,
          devices: closeGroup,
        });

        const removeEuis = new Set(closeGroup.map((m) => m.devEui));
        for (let i = remaining.length - 1; i >= 0; i--) {
          if (removeEuis.has(remaining[i].devEui)) {
            remaining.splice(i, 1);
          }
        }
      } else {
        results.push({
          ...pivot,
          isCluster: false,
        });
        remaining.shift();
      }
    }
    return results;
  }, [markers, mapZoom]);

  // Find active items for Popups
  const activeDevice = useMemo(() => {
    return markers.find((d) => d.devEui === activeDeviceEui);
  }, [activeDeviceEui, markers]);

  const activeCluster = useMemo(() => {
    return (clustered.filter((c) => c.isCluster) as any[]).find((c) => c.id === activeClusterId);
  }, [activeClusterId, clustered]);

  const activeGateway = useMemo(() => {
    return parsedGateways.find((g) => (g.gatewayId || g.id) === activeGatewayId);
  }, [activeGatewayId, parsedGateways]);

  const activeItem = activeDevice || activeCluster || activeGateway;

  const closePopup = () => {
    setActiveDeviceEui(null);
    setActiveClusterId(null);
    setActiveGatewayId(null);
    setAddingToGroupEui(null);
  };

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden z-0 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-[1px] z-10 w-full h-full">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-blue-500 animate-spin" />
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '300px' }}>
        {mapInstance && (
            <>
              {showWeatherControls && (
                <RainViewerLayer map={mapInstance} opacity={0.7} />
              )}
              {/* Device and Cluster Markers */}
              {clustered.map((item) => {
                if (item.isCluster) {
                  const total = item.devices.length;
                  const onlineCount = item.devices.filter((d: any) => {
                    return d.lastSeenAt && (Date.now() - new Date(d.lastSeenAt).getTime()) / 3600000 <= 1;
                  }).length;
                  const offlineCount = total - onlineCount;

                  let colorClass = 'bg-amber-500 text-white border-amber-400 shadow-amber-500/20';
                  let rippleCol = 'border-amber-500';

                  if (onlineCount === total) {
                    colorClass = 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20';
                    rippleCol = 'border-emerald-500';
                  } else if (offlineCount === total) {
                    colorClass = 'bg-red-500 text-white border-red-400 shadow-red-500/20';
                    rippleCol = 'border-red-500';
                  }

                  return (
                    <LeafletOverlay
                      key={item.id}
                      map={mapInstance}
                      lng={item.lng}
                      lat={item.lat}
                      onClick={() => {
                        setActiveClusterId(item.id);
                        setActiveDeviceEui(null);
                        setActiveGatewayId(null);
                      }}
                    >
                      <div className="relative flex items-center justify-center w-10 h-10 rounded-full font-black text-xs border-2 border-white dark:border-slate-900 shadow-lg cursor-pointer transition-all hover:scale-110">
                        <div className={cn("absolute -inset-1 flex items-center justify-center w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 shadow-lg", colorClass)}>
                          <div className={cn("absolute -inset-1.5 rounded-full border border-dashed opacity-45 animate-spin duration-1000", rippleCol)}></div>
                          <span>{total}</span>
                        </div>
                      </div>
                    </LeafletOverlay>
                  );
                } else {
                  const device = item;
                  const isOnline = device.lastSeenAt && (Date.now() - new Date(device.lastSeenAt).getTime()) / 3600000 <= 1;

                  const vars = device.variables || {};
                  const status = device.deviceStatus || {};
                  const soc = vars.batterySoc ?? vars.batteryLevel ?? vars.soc ?? status.batteryLevel ?? status.soc ?? device.soc;
                  const batteryVoltage = vars.batteryVoltage ?? status.batteryVoltage ?? device.batteryVoltage;
                  const isLowBattery = (soc !== undefined && soc <= 25) || (batteryVoltage !== undefined && (batteryVoltage < 12.0 || (batteryVoltage > 16.0 && batteryVoltage < 23.5)));

                  let pingBg = 'bg-rose-500';
                  let markerImage = '/images/marker-solar-light-green.png';
                  let applyOrangeFilter = false;

                  if (focusedDevEui && focusedDevEui.toLowerCase() === device.devEui.toLowerCase()) {
                    pingBg = 'bg-blue-600';
                    markerImage = '/images/marker-solar-light-blue.png';
                  } else if (isLowBattery) {
                    pingBg = 'bg-orange-500';
                    markerImage = '/images/marker-solar-light-green.png';
                    applyOrangeFilter = true;
                  } else if (!isOnline) {
                    pingBg = 'bg-red-600';
                    markerImage = '/images/marker-solar-light-red.png';
                  } else {
                    pingBg = 'bg-emerald-600';
                    markerImage = '/images/marker-solar-light-green.png';
                  }

                  return (
                    <LeafletOverlay
                      key={device.devEui}
                      map={mapInstance}
                      lng={device.lng}
                      lat={device.lat}
                      onClick={() => {
                        setActiveDeviceEui(device.devEui);
                        setActiveClusterId(null);
                        setActiveGatewayId(null);
                      }}
                    >
                      <div className="relative w-[34px] h-[34px] flex items-center justify-center hover:scale-110 transition-transform duration-150 cursor-pointer">
                        <span className={cn("absolute bottom-[1px] w-2.5 h-2.5 rounded-full opacity-75 animate-ping z-[-1]", pingBg)}></span>
                        <img 
                          src={markerImage} 
                          alt="Device Marker" 
                          className="w-[34px] h-[34px] object-contain drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)]" 
                          style={applyOrangeFilter ? { filter: 'hue-rotate(-90deg) saturate(3) brightness(1.1)' } : undefined}
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                    </LeafletOverlay>
                  );
                }
              })}

              {/* Gateway Markers */}
              {parsedGateways.map((gw, idx) => {
                const isOnline = gw.state === 'ONLINE';
                const gatewayId = gw.gatewayId || gw.id || `gw-${idx}`;

                return (
                  <LeafletOverlay
                    key={gatewayId}
                    map={mapInstance}
                    lng={gw.lng}
                    lat={gw.lat}
                    onClick={() => {
                      setActiveGatewayId(gatewayId);
                      setActiveDeviceEui(null);
                      setActiveClusterId(null);
                    }}
                  >
                    <div className={cn("w-6 h-6 rounded-full border border-white dark:border-slate-900 shadow-md flex items-center justify-center cursor-pointer hover:scale-110 transition-transform", isOnline ? 'bg-emerald-500' : 'bg-red-500')}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                        <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                        <line x1="12" y1="20" x2="12.01" y2="20"></line>
                      </svg>
                    </div>
                  </LeafletOverlay>
                );
              })}

              {/* Declarative Popup Overlay inside the Leaflet view */}
              {activeItem && (
                <LeafletOverlay
                  map={mapInstance}
                  lng={activeItem.lng}
                  lat={activeItem.lat}
                  positioning="bottom-center"
                  offset={[0, -25]}
                  stopEvent={true}
                >
                  <div className={cn(
                    "relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 text-xs leading-relaxed dark:text-slate-100 z-50 select-text",
                    activeGateway ? "min-w-[285px] max-w-[340px]" : "min-w-[220px] max-w-[280px]"
                  )}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closePopup();
                      }}
                      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 font-bold p-1 cursor-pointer leading-none text-[14px]"
                    >
                      ✕
                    </button>

                    {activeDevice && (
                      <div>
                        <div className="mb-2 pr-4">
                          <h4 className="font-bold text-[14px] text-slate-950 dark:text-white leading-tight">{activeDevice.name}</h4>
                          <p className="text-[12px] text-slate-700 dark:text-slate-300 font-medium mt-0.5">EUI: <span className="font-mono text-slate-900 dark:text-slate-300 break-all">{activeDevice.devEui}</span></p>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            Status: <span className={activeDevice.lastSeenAt && (Date.now() - new Date(activeDevice.lastSeenAt).getTime()) / 3600000 <= 1 ? "text-emerald-500" : "text-rose-500"}>
                              {activeDevice.lastSeenAt && (Date.now() - new Date(activeDevice.lastSeenAt).getTime()) / 3600000 <= 1 ? 'online' : 'offline'}
                            </span>
                          </p>
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-200 mt-1.5 font-medium border-t border-slate-100 dark:border-slate-800 pt-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span>🔋</span>
                            <span>Battery: {(() => {
                              const soc = activeDevice.variables?.batterySoc ?? activeDevice.variables?.batteryLevel ?? activeDevice.variables?.soc ?? activeDevice.variables?.battery_level;
                              return soc !== undefined ? `${soc}%` : 'N/A';
                            })()}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span>⚡</span>
                            <span>Voltage: {activeDevice.variables?.batteryVoltage !== undefined ? `${activeDevice.variables.batteryVoltage}V` : 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span>💡</span>
                            <span>Brightness: {(() => {
                              const ledCurrent = activeDevice.variables?.ledCurrent !== undefined ? Number(activeDevice.variables.ledCurrent) : 0;
                              const rawBrightness = activeDevice.variables?.brightnessLevel !== undefined ? Number(activeDevice.variables.brightnessLevel) : (activeDevice.variables?.brightness !== undefined ? Number(activeDevice.variables.brightness) : 0);
                              const mapBrightness = ledCurrent > 0 ? (rawBrightness > 0 ? rawBrightness : 100) : 0;
                              return `${mapBrightness}%`;
                            })()}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span>🕒</span>
                            <span className="truncate max-w-[140px]">Last Seen: {activeDevice.lastSeenAt ? new Date(activeDevice.lastSeenAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}</span>
                          </div>
                        </div>

                        <div className="flex flex-row items-center gap-1.5 mt-3 w-full">
                          {!hideDetailButton && (
                            <button
                              type="button"
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded transition-all cursor-pointer flex-1 text-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/devices/${activeDevice.devEui}`);
                              }}
                            >
                              Details
                            </button>
                          )}

                          {selectedGroupId && (
                            (groupDevices && groupDevices.some((d) => d.devEui?.toLowerCase() === activeDevice.devEui?.toLowerCase())) ? (
                              <button
                                type="button"
                                className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded transition-all cursor-pointer flex-1 text-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveDeviceFromGroupWithId?.(selectedGroupId, activeDevice.devEui);
                                }}
                              >
                                Remove from Group
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded transition-all cursor-pointer flex-1 text-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddDeviceToGroup?.(selectedGroupId, activeDevice.devEui);
                                }}
                              >
                                Add to Group
                              </button>
                            )
                          )}

                          {onRemoveDeviceFromGroup && (
                            <button
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded transition-all cursor-pointer flex-1 text-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveDeviceFromGroup(activeDevice.devEui);
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {onAddDeviceToGroup && groups && groups.length > 0 && !selectedGroupId && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            {addingToGroupEui === activeDevice.devEui ? (
                              <div className="relative">
                                <select
                                  onChange={(e) => {
                                    const groupId = e.target.value;
                                    if (groupId && activeDevice) {
                                      onAddDeviceToGroup(groupId, activeDevice.devEui);
                                      setAddingToGroupEui(null); // Close selector after adding
                                    }
                                  }}
                                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">เลือกกลุ่ม...</option>
                                  {groups.map((g: any) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                  ))}
                                </select>
                                <ChevronDownIcon className="absolute right-2 top-2 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAddingToGroupEui(activeDevice.devEui)}
                                className="w-full px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer text-center"
                              >
                                Add to Group
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {activeCluster && (
                      <div>
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1.5 pr-4">
                          <h4 className="font-extrabold text-[13px] text-slate-950 dark:text-white uppercase flex items-center justify-between">
                            <span>Device Cluster</span>
                            <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black">{activeCluster.devices.length} devices</span>
                          </h4>
                        </div>

                        <div className="space-y-1 text-[11px] mb-2 font-medium">
                          <div className="flex justify-between items-center text-emerald-600">
                            <span>Online Devices:</span>
                            <span>{activeCluster.devices.filter((d: any) => d.lastSeenAt && (Date.now() - new Date(d.lastSeenAt).getTime()) / 3600000 <= 1).length} Units</span>
                          </div>
                          <div className="flex justify-between items-center text-red-500">
                            <span>Offline Devices:</span>
                            <span>{activeCluster.devices.length - activeCluster.devices.filter((d: any) => d.lastSeenAt && (Date.now() - new Date(d.lastSeenAt).getTime()) / 3600000 <= 1).length} Units</span>
                          </div>
                        </div>

                        <div className="max-h-24 overflow-y-auto space-y-1 text-[10px] border border-slate-100 dark:border-slate-800 rounded p-1 bg-slate-50 dark:bg-slate-950/40 font-medium select-none">
                          {activeCluster.devices.slice(0, 4).map((d: any) => {
                            const isOnline = d.lastSeenAt && (Date.now() - new Date(d.lastSeenAt).getTime()) / 3600000 <= 1;
                            return (
                              <div
                                key={d.devEui}
                                onClick={() => navigate(`/devices/${d.devEui}`)}
                                className="flex items-center justify-between p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded cursor-pointer transition-colors"
                              >
                                <span className="font-bold truncate max-w-[120px]">{d.name}</span>
                                <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500" : "bg-red-500")} />
                              </div>
                            );
                          })}
                          {activeCluster.devices.length > 4 && (
                            <div className="text-center text-[9px] text-slate-400 py-0.5 font-bold uppercase">
                              + {activeCluster.devices.length - 4} More Devices
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeGateway && (
                      <div className="text-left w-full">
                        <div className="flex items-center justify-between gap-4 mb-2 pr-4">
                          <h4 className="font-extrabold text-sm text-[#0f172a] dark:text-white leading-none">
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
                      </div>
                    )}

                    {/* Speech bubble pointer arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 rotate-45 -mt-1.5 z-[-1]" />
                  </div>
                </LeafletOverlay>
              )}
            </>
          )}
        </div>
    </div>
  );
};

export default DeviceMap;
