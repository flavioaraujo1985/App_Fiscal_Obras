import L from 'leaflet';
import { useEffect, useRef } from 'react';

export interface GeoMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

interface GeoMapProps {
  markers: GeoMarker[];
  heightClass?: string;
}

export default function GeoMap({ markers, heightClass = 'h-80' }: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const center: [number, number] =
        markers.length > 0 ? [markers[0].latitude, markers[0].longitude] : [-7.12, -35.88];
      mapRef.current = L.map(containerRef.current).setView(center, 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    if (markers.length > 0) {
      const bounds = L.latLngBounds([]);
      markers.forEach((m) => {
        const icon = L.divIcon({
          className: 'fiscal-map-pin',
          html: `<div style="width:14px;height:14px;border-radius:9999px;background:#004A8F;border:2px solid #ffffff;box-shadow:0 1px 4px rgba(15,23,42,0.4);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const popupHtml = `
          <div style="min-width:180px;font-family:Public Sans,sans-serif;">
            <div style="font-weight:600;font-size:12px;color:#0f172a;margin-bottom:4px;">${m.title}</div>
            ${m.subtitle ? `<div style="font-size:11px;color:#475569;margin-bottom:6px;">${m.subtitle}</div>` : ''}
            ${
              m.imageUrl
                ? `<img src="${m.imageUrl}" alt="${m.title}" style="width:100%;height:96px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;" />`
                : ''
            }
            <div style="font-family:JetBrains Mono,monospace;font-size:10px;color:#64748b;margin-top:4px;">
              ${m.latitude.toFixed(5)}, ${m.longitude.toFixed(5)}
            </div>
          </div>
        `;

        L.marker([m.latitude, m.longitude], { icon })
          .addTo(map)
          .bindPopup(popupHtml);
        bounds.extend([m.latitude, m.longitude]);
      });

      if (markers.length === 1) {
        map.setView([markers[0].latitude, markers[0].longitude], 15);
      } else {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
      }
    }
  }, [markers]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-lg border border-slate-200 overflow-hidden bg-slate-100`}
    />
  );
}
