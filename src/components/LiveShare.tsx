import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Shield, MapPin, Clock, Share2, Navigation, AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react';

export const LiveShare: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [invalidParams, setInvalidParams] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const latStr = params.get('lat');
    const lngStr = params.get('lng');
    const tStr = params.get('t');

    const parsedLat = parseFloat(latStr || '');
    const parsedLng = parseFloat(lngStr || '');
    const parsedT = parseInt(tStr || '', 10);

    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      setLat(parsedLat);
      setLng(parsedLng);
      setTimestamp(!isNaN(parsedT) ? parsedT : Date.now());
    } else {
      // Default fallback if parameters are missing/invalid
      setLat(21.1458);
      setLng(79.0882);
      setTimestamp(Date.now());
      setInvalidParams(true);
    }
  }, []);

  useEffect(() => {
    if (lat === null || lng === null || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Custom glowing tracking marker
    const trackingIcon = L.divIcon({
      className: 'custom-tracking-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: rgba(6, 182, 212, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 18px; height: 18px; border-radius: 50%; background-color: #06b6d4; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(6, 182, 212, 0.8);"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker([lat, lng], { icon: trackingIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #06b6d4;">Live Tracked User</strong><br/>
          <span>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</span>
        </div>`
      )
      .openPopup();

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-md">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide flex items-center gap-2">
              Safe Route <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">Live Tracking</span>
            </h1>
            <p className="text-xs text-zinc-400">Public Live Location Broadcast</p>
          </div>
        </div>

        <a
          href="/app"
          className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-colors"
        >
          <span>Open App</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {invalidParams && (
          <div className="rounded-xl border border-amber-800/80 bg-amber-950/40 p-3.5 text-xs text-amber-200 flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Missing or invalid URL location parameters (`lat`, `lng`). Showing default coordinates.</span>
          </div>
        )}

        {/* Tracking Details Banner */}
        <div className="rounded-2xl border border-cyan-800/60 bg-zinc-900/80 p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span>ACTIVE LIVE TRACKING SESSION</span>
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-cyan-400" />
                <span>Latitude: {lat?.toFixed(5)}, Longitude: {lng?.toFixed(5)}</span>
              </h2>
              {timestamp && (
                <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Shared at: {new Date(timestamp).toLocaleString()}</span>
                </p>
              )}
            </div>

            <button
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied Link!' : 'Share This Page'}</span>
            </button>
          </div>
        </div>

        {/* Leaflet Map Container */}
        <div className="rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl h-[500px] relative bg-zinc-900">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-4 px-6 text-center text-xs text-zinc-500">
        Safe Route &copy; {new Date().getFullYear()} — Public Emergency Live Location Sharing
      </footer>
    </div>
  );
};
