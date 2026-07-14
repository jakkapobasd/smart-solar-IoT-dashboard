import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface RainViewerLayerProps {
  map: L.Map | null;
  opacity?: number;
}

const RainViewerLayer: React.FC<RainViewerLayerProps> = ({ map, opacity = 0.7 }) => {
  const layerRef = useRef<L.TileLayer | null>(null);
  const controlContainerRef = useRef<HTMLDivElement | null>(null);
  const controlInstanceRef = useRef<L.Control | null>(null);

  useEffect(() => {
    if (!map) return;

    let active = true;

    // 1. สร้างกล่อง UI สำหรับแสดงเวลาเรดาร์และสัญลักษณ์สี
    const RainViewerControl = L.Control.extend({
      onAdd: function() {
        const mainContainer = L.DomUtil.create(
          'div', 
          'leaflet-bar leaflet-control leaflet-control-custom bg-white/70 dark:bg-slate-950/70 backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-lg text-xs font-semibold text-slate-600 dark:text-slate-300'
        );

        // The container itself will hold the timestamp text.
        controlContainerRef.current = mainContainer;
        
        return mainContainer;
      },
      onRemove: function() {
        controlContainerRef.current = null;
      }
    });

    if (!controlInstanceRef.current) {
      controlInstanceRef.current = new RainViewerControl({ position: 'bottomleft' });
      map.addControl(controlInstanceRef.current);
    }

    const fetchAndDisplayLatest = async () => {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!active) return;
        
        const data = await res.json();

        const radarFrames: Array<{ time: number; path: string }> = data?.radar?.past;
        const latestFrame = radarFrames?.[radarFrames.length - 1];

        if (!latestFrame) {
          console.warn('[RainViewer] No radar frames available.');
          if (controlContainerRef.current) {
            controlContainerRef.current.innerHTML = 'เรดาร์ฝน: ไม่มีข้อมูล';
          }
          return;
        }

        const host = data.host || 'https://tilecache.rainviewer.com';
        const tileOptions = '/256/{z}/{x}/{y}/3/1_1.png';

        if (layerRef.current && map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
        
        const url = host + latestFrame.path + tileOptions;
        const newLayer = L.tileLayer(url, {
          tileSize: 256,
          opacity: opacity, // Set initial opacity from props
          zIndex: 450,
          maxZoom: 18,
          maxNativeZoom: 7,
        });

        newLayer.addTo(map);
        layerRef.current = newLayer;

        if (controlContainerRef.current) {
          const frameTime = new Date(latestFrame.time * 1000);
          controlContainerRef.current.innerHTML = `เรดาร์ฝน (ล่าสุด): ${frameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

      } catch (error) { 
        console.error("[RainViewer] Failed to fetch data:", error); 
        if (controlContainerRef.current) {
          controlContainerRef.current.innerHTML = 'เรดาร์ฝน: โหลดล้มเหลว';
        }
      }
    };

    fetchAndDisplayLatest();

    return () => {
      active = false;
      try {
        if (layerRef.current && (layerRef.current as any)._map) {
          map?.removeLayer(layerRef.current);
        }
        if (controlInstanceRef.current && (controlInstanceRef.current as any)._map) {
          map?.removeControl(controlInstanceRef.current);
        }
      } catch (e) {
        // Failsafe for when map is destroyed before layer.
      }
      layerRef.current = null;
      controlInstanceRef.current = null;
    };
  }, [map]); // Dependency is now only on map

  // Effect for updating opacity only
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  return null;
};

export default RainViewerLayer;