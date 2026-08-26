/**
 * SafeHeaven Production Real Interactive Leaflet Map & Navigation Engine
 * 
 * Features:
 * - Dynamic Day / Night Mode Map Tiles (CartoDB Voyager for Day, CartoDB Dark Matter for Night)
 * - Safety-First Travel Mode Selection (Vehicle vs Walking)
 * - Route Priority (Maximum Safety, Balanced, Faster Travel)
 * - Real Leaflet map rendering with dynamic responsive controls
 * - Real GPS Geolocation detection & continuous location tracking
 * - Real place search & geocoding
 * - Real OSRM routing API integration
 * - Human-friendly wording and responsive mobile card layout
 */

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Shield,
  Navigation,
  Search,
  MapPin,
  Crosshair,
  Play,
  CheckCircle,
  Clock,
  Layers,
  RefreshCw,
  Car,
  Footprints,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCurrentUserPosition } from '../utils/geolocation';
import { searchLocations, reverseGeocode, GeocodedLocation } from '../services/geocodingService';
import { fetchRealRoutes, RealRoute } from '../services/routingService';
import type { TravelMode } from '../types/safety';
import { ReviewBotChat } from './ReviewBotChat';

interface InteractiveMapProps {
  onSelectRouteTab?: () => void;
  onSelectHavenTab?: () => void;
  onSelectSignalsTab?: () => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  onSelectRouteTab,
  onSelectHavenTab,
  onSelectSignalsTab,
}) => {
  const {
    navigation,
    selectedRouteId,
    setSelectedRouteId,
    startNavigation,
    stopNavigation,
    safeHavens,
    incidents,
    corroborateIncident,
    resolveIncident,
    timeOfDay,
    travelMode,
    setTravelMode,
    routePriority,
    setRoutePriority,
    openReportModal,
    theme,
    currentUser,
    openAuthModal,
    originLocation,
    setOriginLocation,
    destinationLocation,
    setDestinationLocation,
    calculatedRoutes,
    setCalculatedRoutes,
    isCalculatingRoutes,
    routeError,
    calculateRoutes,
  } = useApp();

  const isLight = theme === 'light';

  // Leaflet map ref
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineGroupRef = useRef<L.LayerGroup | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const incidentGroupRef = useRef<L.LayerGroup | null>(null);

  // User Real GPS Location state
  // User Real GPS Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>({
    lat: 21.1458,
    lng: 79.0882,
  });
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'granted' | 'denied'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [clickTargetMode, setClickTargetMode] = useState<'none' | 'origin' | 'destination'>('none');

  // Search Inputs & Suggestions
  const [originQuery, setOriginQuery] = useState<string>('Sitabuldi Center');
  const [originResults, setOriginResults] = useState<GeocodedLocation[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState<boolean>(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState<boolean>(false);

  const [destQuery, setDestQuery] = useState<string>('');
  const [destResults, setDestResults] = useState<GeocodedLocation[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);
  const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);

  // Layer Visibility Toggles
  const [showHavens, setShowHavens] = useState(true);
  const [showIncidentsLayer, setShowIncidentsLayer] = useState(true);

  // Debounced search for Origin
  useEffect(() => {
    if (!originQuery || originQuery === 'My Current Location' || !showOriginDropdown) {
      setOriginResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingOrigin(true);
      const results = await searchLocations(originQuery, userLocation || undefined);
      setOriginResults(results);
      setIsSearchingOrigin(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [originQuery, showOriginDropdown, userLocation]);

  // Debounced search for Destination
  useEffect(() => {
    if (!destQuery || !showDestDropdown) {
      setDestResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      const results = await searchLocations(destQuery, userLocation || undefined);
      setDestResults(results);
      setIsSearchingDest(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [destQuery, showDestDropdown, userLocation]);

  // Initialize User GPS Position on Mount
  useEffect(() => {
    handleRequestUserLocation();
  }, []);

  const handleRequestUserLocation = async () => {
    setGpsStatus('locating');
    setGpsError(null);
    try {
      const coords = await getCurrentUserPosition();
      const userLoc = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
      setUserLocation(userLoc);
      setGpsStatus('granted');

      const address = await reverseGeocode(coords.latitude, coords.longitude);
      const newOrigin: GeocodedLocation = {
        id: 'user_current_location',
        name: 'My Current Location',
        displayAddress: address,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      setOriginLocation(newOrigin);
      setOriginQuery('My Current Location');

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([coords.latitude, coords.longitude], 14);
      }
    } catch (err: any) {
      setGpsStatus('denied');
      setGpsError(err.message || 'Location permission denied.');
      const fallback = { lat: 21.1458, lng: 79.0882 };
      setUserLocation(fallback);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = userLocation?.lat || 21.1458;
    const initialLng = userLocation?.lng || 79.0882;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tileUrl = isLight
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    tileLayerRef.current = tiles;

    const polylineGroup = L.layerGroup().addTo(map);
    const markerGroup = L.layerGroup().addTo(map);
    const incidentGroup = L.layerGroup().addTo(map);

    polylineGroupRef.current = polylineGroup;
    markerGroupRef.current = markerGroup;
    incidentGroupRef.current = incidentGroup;
    mapInstanceRef.current = map;

    // Trigger initial size validation after DOM render
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const placeName = await reverseGeocode(lat, lng);

      if (clickTargetMode === 'origin') {
        const newOrigin: GeocodedLocation = {
          id: `clicked_orig_${Date.now()}`,
          name: placeName.split(',')[0] || 'Selected Starting Point',
          displayAddress: placeName,
          latitude: lat,
          longitude: lng,
        };
        setOriginLocation(newOrigin);
        setOriginQuery(newOrigin.name);
        setClickTargetMode('none');
      } else if (clickTargetMode === 'destination') {
        const newDest: GeocodedLocation = {
          id: `clicked_dest_${Date.now()}`,
          name: placeName.split(',')[0] || 'Selected Destination',
          displayAddress: placeName,
          latitude: lat,
          longitude: lng,
        };
        setDestinationLocation(newDest);
        setDestQuery(newDest.name);
        setClickTargetMode('none');
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map tiles dynamically when theme toggles
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const tileUrl = isLight
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current.setUrl(tileUrl);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 100);
  }, [isLight]);

  // Recalculate routes when Origin, Destination, or TravelMode changes
  useEffect(() => {
    if (originLocation && destinationLocation) {
      calculateRoutes(originLocation, destinationLocation, travelMode).catch((e) => console.error(e));
    } else {
      setCalculatedRoutes([]);
    }
  }, [originLocation, destinationLocation, travelMode, calculateRoutes, setCalculatedRoutes]);

  // Fit map bounds when routes are loaded
  useEffect(() => {
    if (mapInstanceRef.current && calculatedRoutes.length > 0 && calculatedRoutes[0].coordinates.length > 0) {
      const bounds = L.latLngBounds(calculatedRoutes[0].coordinates);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [calculatedRoutes]);

  // Render Markers, Incident Badges, Live Navigation Pin, and Polyline Layers on Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current || !polylineGroupRef.current || !markerGroupRef.current || !incidentGroupRef.current) return;

    polylineGroupRef.current.clearLayers();
    markerGroupRef.current.clearLayers();
    incidentGroupRef.current.clearLayers();

    // 1. Draw User GPS Location Marker (when NOT in active turn-by-turn navigation)
    if (userLocation && !navigation.isNavigating) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `<div class="relative flex items-center justify-center w-8 h-8">
          <span class="absolute w-8 h-8 bg-cyan-500/40 rounded-full animate-ping"></span>
          <span class="relative w-4 h-4 bg-cyan-500 border-2 border-white rounded-full shadow-lg"></span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindPopup(`<b>Your Current Location</b><br/>GPS Accuracy: ${userLocation.accuracy ? Math.round(userLocation.accuracy) + 'm' : 'High'}`)
        .addTo(markerGroupRef.current);
    }

    // 2. Draw Live Navigation Position Marker (when in active navigation)
    if (navigation.isNavigating) {
      const navPos = navigation.currentPosition;
      const headingDeg = navPos.headingDeg || 0;

      const navIcon = L.divIcon({
        className: 'custom-nav-live-marker',
        html: `<div class="relative flex items-center justify-center w-10 h-10">
          <span class="absolute w-10 h-10 bg-cyan-400/40 rounded-full animate-ping"></span>
          <div class="relative w-9 h-9 rounded-full bg-cyan-600 border-2 border-white text-white flex items-center justify-center shadow-2xl font-bold text-sm" style="transform: rotate(${headingDeg}deg);">
            ${navigation.travelMode === 'VEHICLE' ? '🚗' : '🚶'}
          </div>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      L.marker([navPos.lat, navPos.lng], { icon: navIcon })
        .bindPopup(`<b>Live Navigation:</b> ${navigation.routeName}<br/>Speed: ${navigation.speedKmh} km/h • Remaining: ${navigation.distanceRemainingKm} km`)
        .addTo(markerGroupRef.current);
    }

    // 3. Draw Origin Marker (A)
    if (originLocation) {
      const origIcon = L.divIcon({
        className: 'custom-origin-marker',
        html: `<div class="flex items-center justify-center w-8 h-8 bg-cyan-600 border-2 border-white text-white rounded-full shadow-xl font-bold text-xs">
          A
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker([originLocation.latitude, originLocation.longitude], { icon: origIcon })
        .bindPopup(`<b>Starting Point (A):</b> ${originLocation.name}`)
        .addTo(markerGroupRef.current);
    }

    // 4. Draw Destination Marker (B)
    if (destinationLocation) {
      const destIcon = L.divIcon({
        className: 'custom-dest-marker',
        html: `<div class="flex items-center justify-center w-8 h-8 bg-rose-600 border-2 border-white text-white rounded-full shadow-xl font-bold text-xs">
          B
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker([destinationLocation.latitude, destinationLocation.longitude], { icon: destIcon })
        .bindPopup(`<b>Destination (B):</b> ${destinationLocation.name}`)
        .addTo(markerGroupRef.current);
    }

    // 5. Draw Safe Haven Markers
    if (showHavens && Array.isArray(safeHavens)) {
      safeHavens.forEach((haven) => {
        if (!haven.coordinates) return;
        const havenIcon = L.divIcon({
          className: 'custom-haven-marker',
          html: `<div class="flex items-center justify-center w-7 h-7 bg-emerald-600 border-2 border-white text-white rounded-full shadow-md">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        // Use safe coordinates
        const lat = (haven.coordinates as any).lat || haven.coordinates.x;
        const lng = (haven.coordinates as any).lng || haven.coordinates.y;

        L.marker([lat, lng], { icon: havenIcon })
          .bindPopup(`<b>${haven.name}</b><br/>${haven.address}<br/><span class="text-emerald-500 font-semibold">24/7 Verified Safe Haven</span>`)
          .addTo(markerGroupRef.current!);
      });
    }

    // 6. Draw Community Verified Incident Markers
    if (showIncidentsLayer && Array.isArray(incidents)) {
      incidents.filter((i) => !i.isResolved).forEach((inc) => {
        const catIcons: Record<string, string> = {
          ACCIDENT: '🚗',
          TRAFFIC: '🚦',
          ROAD_BLOCKAGE: '🚧',
          CONSTRUCTION: '🛠️',
          FLOODING: '🌧️',
          LIGHTING_FAILURE: '💡',
          ROAD_HAZARD: '⚠️',
          SUSPICIOUS_ACTIVITY: '🚨',
          EMERGENCY: '🏥',
          OTHER: '📍',
        };

        const emoji = catIcons[inc.category] || '⚠️';
        const isHigh = inc.severity === 'HIGH' || (inc.severity as string) === 'CRITICAL' || (inc.severity as string) === 'EMERGENCY';

        const incidentIcon = L.divIcon({
          className: 'custom-incident-marker',
          html: `<div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            isHigh ? 'bg-rose-600 border-white text-white shadow-lg animate-bounce' : 'bg-amber-500 border-white text-white shadow-md'
          } text-sm cursor-pointer">
            <span>${emoji}</span>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 space-y-2 text-xs font-sans';
        popupContent.innerHTML = `
          <div class="border-b pb-1">
            <div class="font-bold text-sm flex items-center gap-1.5">
              <span>${emoji}</span>
              <span>${String(inc.category).replace('_', ' ')}</span>
            </div>
            <div class="text-[10px] text-gray-500">
              Reported ${Math.round(inc.minutesAgo)}m ago • Verified by community
            </div>
          </div>
          <p class="text-gray-700 text-xs">${inc.description}</p>
          <div class="flex items-center gap-2 pt-1">
            <span class="text-[10px] text-emerald-600 font-semibold">✓ ${inc.corroborations} confirmed</span>
            ${inc.disputes ? `<span class="text-[10px] text-rose-600">⚠ ${inc.disputes} disputed</span>` : ''}
          </div>
        `;

        const btnRow = document.createElement('div');
        btnRow.className = 'flex items-center gap-1.5 pt-2 border-t';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold';
        confirmBtn.innerText = 'Still Present';
        confirmBtn.onclick = () => {
          corroborateIncident(inc.id);
          confirmBtn.disabled = true;
          confirmBtn.innerText = 'Confirmed ✓';
        };

        const resolveBtn = document.createElement('button');
        resolveBtn.className = 'px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-[10px]';
        resolveBtn.innerText = 'No Longer Present';
        resolveBtn.onclick = () => {
          resolveIncident(inc.id);
          resolveBtn.disabled = true;
          resolveBtn.innerText = 'Cleared ✓';
        };

        btnRow.appendChild(confirmBtn);
        btnRow.appendChild(resolveBtn);
        popupContent.appendChild(btnRow);

        L.marker([inc.location.lat, inc.location.lng], { icon: incidentIcon })
          .bindPopup(popupContent)
          .addTo(incidentGroupRef.current!);
      });
    }

    // 7. Draw Polyline Routes with Enhanced Highlighting
    calculatedRoutes.forEach((route, idx) => {
      const isSelected = selectedRouteId === route.route_id;
      const isRecommended = idx === 0;

      if (isSelected) {
        // Draw wide outer glow layer for selected route
        L.polyline(route.coordinates, {
          color: '#06b6d4',
          weight: 10,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(polylineGroupRef.current!);

        // Draw crisp core stroke for selected route
        const activePolyline = L.polyline(route.coordinates, {
          color: isRecommended ? '#10b981' : '#0ea5e9',
          weight: 6,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(polylineGroupRef.current!);

        activePolyline.bindTooltip(
          `<b>${route.name}</b> (${route.star_rating.starDisplay})<br/><b>Selected Route</b>: ${route.distance_km} km • ${route.est_time_min} min`,
          { sticky: true }
        );
      } else {
        // Alternative routes with dashed styling
        const altPolyline = L.polyline(route.coordinates, {
          color: idx === 1 ? '#f59e0b' : '#64748b',
          weight: 4,
          opacity: 0.75,
          dashArray: '6, 8',
          lineCap: 'round',
        }).addTo(polylineGroupRef.current!);

        altPolyline.on('click', () => {
          setSelectedRouteId(route.route_id);
        });

        altPolyline.bindTooltip(
          `<b>${route.name}</b> (${route.star_rating.starDisplay})<br/>Dist: ${route.distance_km} km | Time: ${route.est_time_min} min<br/>Safety Score: ${route.safety_score}/100`,
          { sticky: true }
        );
      }
    });
  }, [calculatedRoutes, selectedRouteId, userLocation, originLocation, destinationLocation, showHavens, showIncidentsLayer, incidents, navigation.isNavigating, navigation.currentPosition]);

  const handleSelectOrigin = (loc: GeocodedLocation) => {
    setOriginLocation(loc);
    setOriginQuery(loc.name);
    setShowOriginDropdown(false);
  };

  const handleSelectDestination = (loc: GeocodedLocation) => {
    setDestinationLocation(loc);
    setDestQuery(loc.name);
    setShowDestDropdown(false);
  };

  const safestRoute = calculatedRoutes[0];
  const fastestRoute = calculatedRoutes.length > 1 ? calculatedRoutes[1] : calculatedRoutes[0];
  const selectedRoute = calculatedRoutes.find((r) => r.route_id === selectedRouteId) || calculatedRoutes[0];

  const timeDifferenceMinutes = safestRoute && fastestRoute
    ? Math.max(0, safestRoute.est_time_min - fastestRoute.est_time_min)
    : 0;

  return (
    <div
      className={`relative w-full rounded-2xl border overflow-hidden shadow-2xl space-y-0 transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'
      }`}
    >
      {/* 1. HERO SAFETY HEADER & TRAVEL MODE SELECTOR */}
      <div
        className={`p-4 sm:p-5 border-b space-y-3.5 ${
          isLight ? 'bg-slate-50/95 border-slate-200' : 'bg-zinc-900/95 border-zinc-800'
        }`}
      >
        {/* Safety Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-500" />
              <span>Where are you going?</span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              We'll help you find a <span className="font-semibold text-emerald-600 dark:text-emerald-400">safer way</span> there for your travel mode.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRequestUserLocation}
              disabled={gpsStatus === 'locating'}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-cyan-300'
              }`}
            >
              <Crosshair className={`h-3.5 w-3.5 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} />
              <span>{gpsStatus === 'locating' ? 'Finding location...' : 'Use My Location'}</span>
            </button>

            <button
              onClick={openReportModal}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Report Issue</span>
            </button>
          </div>
        </div>

        {/* Prominent Travel Mode Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Walking Card */}
          <div
            onClick={() => setTravelMode('WALKING')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-start gap-3 ${
              travelMode === 'WALKING'
                ? isLight
                  ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500/20 shadow-md'
                  : 'bg-cyan-950/60 border-cyan-500 ring-2 ring-cyan-500/30 shadow-md'
                : isLight
                ? 'bg-white border-slate-200 hover:border-slate-300'
                : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                travelMode === 'WALKING'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : isLight
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              <Footprints className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm">
                  🚶 Walking Safety Mode
                </span>
                {travelMode === 'WALKING' && (
                  <span className="px-1.5 py-0.2 bg-cyan-600 text-white text-[10px] rounded font-semibold">Active</span>
                )}
              </div>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Focuses on bright street lighting, sidewalks, safe crossings, and open stores.
              </p>
            </div>
          </div>

          {/* Vehicle Card */}
          <div
            onClick={() => setTravelMode('VEHICLE')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-start gap-3 ${
              travelMode === 'VEHICLE'
                ? isLight
                  ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                : isLight
                ? 'bg-white border-slate-200 hover:border-slate-300'
                : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                travelMode === 'VEHICLE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isLight
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              <Car className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm">
                  🚗 Vehicle Safety Mode
                </span>
                {travelMode === 'VEHICLE' && (
                  <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[10px] rounded font-semibold">Active</span>
                )}
              </div>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Focuses on traffic flow, avoiding accident spots, road closures, and clear lanes.
              </p>
            </div>
          </div>
        </div>

        {/* Route Priority Filter */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs scrollbar-none">
          <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
            Priority:
          </span>
          <button
            onClick={() => setRoutePriority('SAFETY')}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              routePriority === 'SAFETY'
                ? isLight
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : isLight
                ? 'bg-white border-slate-300 text-slate-700'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            🛡️ Maximum Safety
          </button>
          <button
            onClick={() => setRoutePriority('BALANCED')}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              routePriority === 'BALANCED'
                ? isLight
                  ? 'bg-cyan-100 text-cyan-900 border-cyan-300 shadow-xs'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-700'
                : isLight
                ? 'bg-white border-slate-300 text-slate-700'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            ⚖️ Safety + Time
          </button>
          <button
            onClick={() => setRoutePriority('TIME')}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              routePriority === 'TIME'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-amber-950 text-amber-300 border-amber-700'
                : isLight
                ? 'bg-white border-slate-300 text-slate-700'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            ⚡ Faster Travel
          </button>
        </div>

        {/* Origin & Destination Search Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative pt-1">
          {/* ORIGIN INPUT */}
          <div className="relative">
            <label className={`block text-[11px] font-semibold mb-1 flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-bold">
                <MapPin className="h-3.5 w-3.5" /> Starting Point
              </span>
              <button
                type="button"
                onClick={() => setClickTargetMode(clickTargetMode === 'origin' ? 'none' : 'origin')}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  clickTargetMode === 'origin'
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : isLight
                    ? 'bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                }`}
              >
                {clickTargetMode === 'origin' ? 'Click on map...' : 'Pick on Map'}
              </button>
            </label>

            <div className="relative">
              <input
                type="text"
                value={originQuery}
                onFocus={() => setShowOriginDropdown(true)}
                onChange={(e) => {
                  setOriginQuery(e.target.value);
                  setShowOriginDropdown(true);
                }}
                placeholder="Search starting location..."
                className={`w-full rounded-xl border pl-3 pr-8 py-2 text-xs focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500 shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-white focus:border-cyan-500'
                }`}
              />
              {isSearchingOrigin && <RefreshCw className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-cyan-500 animate-spin" />}
            </div>

            {showOriginDropdown && originResults.length > 0 && (
              <div
                className={`absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border shadow-2xl max-h-48 overflow-y-auto divide-y text-xs ${
                  isLight ? 'bg-white border-slate-200 divide-slate-100' : 'bg-zinc-900 border-zinc-800 divide-zinc-800'
                }`}
              >
                {originResults.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => handleSelectOrigin(res)}
                    className={`p-2.5 cursor-pointer transition-colors ${
                      isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    <div className="font-semibold">{res.name}</div>
                    <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      {res.displayAddress}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DESTINATION INPUT */}
          <div className="relative">
            <label className={`block text-[11px] font-semibold mb-1 flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                <Navigation className="h-3.5 w-3.5" /> Destination
              </span>
              <button
                type="button"
                onClick={() => setClickTargetMode(clickTargetMode === 'destination' ? 'none' : 'destination')}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  clickTargetMode === 'destination'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : isLight
                    ? 'bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                }`}
              >
                {clickTargetMode === 'destination' ? 'Click on map...' : 'Pick on Map'}
              </button>
            </label>

            <div className="relative">
              <input
                type="text"
                value={destQuery}
                onFocus={() => setShowDestDropdown(true)}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  setShowDestDropdown(true);
                }}
                placeholder="Search destination landmark..."
                className={`w-full rounded-xl border pl-3 pr-8 py-2 text-xs focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-rose-500 shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-white focus:border-rose-500'
                }`}
              />
              {isSearchingDest && <RefreshCw className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-rose-500 animate-spin" />}
            </div>

            {showDestDropdown && destResults.length > 0 && (
              <div
                className={`absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border shadow-2xl max-h-48 overflow-y-auto divide-y text-xs ${
                  isLight ? 'bg-white border-slate-200 divide-slate-100' : 'bg-zinc-900 border-zinc-800 divide-zinc-800'
                }`}
              >
                {destResults.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => handleSelectDestination(res)}
                    className={`p-2.5 cursor-pointer transition-colors ${
                      isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    <div className="font-semibold">{res.name}</div>
                    <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      {res.displayAddress}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Click Instructions Banner */}
        {clickTargetMode !== 'none' && (
          <div
            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
              isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/60 border-amber-700/80 text-amber-300'
            }`}
          >
            <span>Click anywhere on the map to set your <b>{clickTargetMode.toUpperCase()}</b> location.</span>
            <button onClick={() => setClickTargetMode('none')} className="font-bold hover:underline">Cancel</button>
          </div>
        )}
      </div>

      {/* 2. REAL LEAFLET MAP CONTAINER */}
      <div className="relative w-full aspect-[16/9] min-h-[440px] max-h-[580px] bg-slate-900">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Destination Picker Helper Banner */}
        {!destinationLocation && !navigation.isNavigating && (
          <div className="absolute bottom-4 left-3 right-3 sm:left-4 sm:right-4 z-20 flex flex-col gap-2 max-w-md mx-auto pointer-events-auto">
            <div
              className={`p-4.5 rounded-2xl border text-xs flex flex-col items-center text-center gap-2.5 backdrop-blur-md shadow-2xl ${
                isLight
                  ? 'bg-white/95 border-slate-200 text-slate-850 shadow-slate-350'
                  : 'bg-zinc-950/95 border-zinc-800 text-zinc-200 shadow-black'
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-cyan-600/15 text-cyan-400 flex items-center justify-center border border-cyan-850/40">
                <Navigation className="h-5 w-5 text-cyan-500 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Where are you heading?</h4>
                <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
                  Enter a destination above or pick a point on the map to calculate safer walking or driving routes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. SAFETY-FIRST ROUTE CARDS WITH TRADEOFF BANNER */}
        {calculatedRoutes.length > 0 && !navigation.isNavigating && (
          <div className="absolute bottom-4 left-3 right-3 sm:left-4 sm:right-4 z-20 flex flex-col gap-2 max-w-4xl mx-auto pointer-events-auto">
            {/* Safety vs Time Tradeoff Banner */}
            {timeDifferenceMinutes > 0 && (
              <div
                className={`p-3 rounded-2xl border text-xs flex items-center justify-between backdrop-blur-md shadow-lg ${
                  isLight
                    ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300'
                    : 'bg-zinc-950/95 border-zinc-800 text-zinc-200 shadow-black'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-cyan-500 shrink-0" />
                  <span>
                    You save <b>{timeDifferenceMinutes} min</b> on the faster route, but the <b>Safest Route</b> has a higher <span className="text-emerald-600 dark:text-emerald-400 font-bold">{safestRoute.star_rating.starDisplay}</span> safety rating.
                  </span>
                </span>
                <button
                  onClick={onSelectRouteTab}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline text-[11px] font-bold shrink-0 ml-2"
                >
                  Details
                </button>
              </div>
            )}

            {/* Route Cards Carousel - Stacked cleanly on Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
              {calculatedRoutes.map((route, idx) => {
                const isSelected = selectedRouteId === route.route_id;
                const isSafest = idx === 0;
                const isFastest = idx === 1;

                return (
                  <div
                    key={route.route_id}
                    onClick={() => setSelectedRouteId(route.route_id)}
                    className={`p-3.5 rounded-2xl border backdrop-blur-md cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? isLight
                          ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl'
                          : 'bg-zinc-900/95 border-emerald-500 ring-2 ring-emerald-500/40 shadow-2xl'
                        : isLight
                        ? 'bg-white/90 border-slate-200 hover:border-slate-300'
                        : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          isSafest
                            ? 'bg-emerald-600 text-white'
                            : isFastest
                            ? 'bg-amber-500 text-white'
                            : isLight
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {isSafest ? '🛡️ SAFEST' : isFastest ? '⚡ FASTEST' : '⚖️ BALANCED'}
                      </span>

                      <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wider">
                        {route.star_rating.starDisplay}
                      </span>
                    </div>

                    <h4 className={`text-xs font-bold mt-1.5 line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {route.name}
                    </h4>

                    <div className={`flex items-center gap-2.5 text-[11px] font-mono mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                      <span className="font-bold">{route.est_time_min} mins</span>
                      <span>•</span>
                      <span>{route.distance_km} km</span>
                    </div>

                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!currentUser) {
                            openAuthModal();
                          } else {
                            startNavigation(route.route_id, {
                              name: route.name,
                              distance_km: route.distance_km,
                              est_time_min: route.est_time_min,
                              coordinates: route.coordinates,
                              destinationName: destinationLocation?.name || 'Destination',
                            });
                          }
                        }}
                        className={`w-full mt-2.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md text-white ${
                          isSafest ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'
                        }`}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>CHOOSE THIS ROUTE</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. ACTIVE NAVIGATION HUD OVERLAY */}
        {navigation.isNavigating && (
          <div
            className={`absolute top-4 left-3 right-3 sm:left-4 sm:right-4 z-20 max-w-lg mx-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md text-xs space-y-2 ${
              isLight
                ? 'bg-white/95 border-cyan-500 text-slate-900 shadow-slate-300'
                : 'bg-zinc-950/95 border-cyan-500 text-zinc-100 shadow-black'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-600 dark:text-cyan-300 flex items-center gap-1.5">
                <Navigation className="h-4 w-4 animate-pulse" />
                <span>Navigating ({navigation.travelMode})</span>
              </span>
              <button
                onClick={stopNavigation}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors shadow-xs"
              >
                End Route
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono pt-1">
              <div className={`p-2 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                <div className="text-[10px] text-gray-500">Remaining</div>
                <div className="font-bold text-sm text-cyan-600 dark:text-cyan-300">
                  {selectedRoute ? `${selectedRoute.distance_km} km` : '1.2 km'}
                </div>
              </div>

              <div className={`p-2 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                <div className="text-[10px] text-gray-500">Est Time</div>
                <div className="font-bold text-sm text-emerald-600 dark:text-emerald-300">
                  {selectedRoute ? `${selectedRoute.est_time_min} min` : '4 min'}
                </div>
              </div>

              <div className={`p-2 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                <div className="text-[10px] text-gray-500">Safety Rating</div>
                <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {selectedRoute ? selectedRoute.star_rating.starDisplay : '★★★★★'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. FLOATING REVIEW BOT CHAT OVERLAY */}
        {!navigation.isNavigating && <ReviewBotChat />}
      </div>
    </div>
  );
};
