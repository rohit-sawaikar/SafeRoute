import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { reverseGeocode, searchLocations } from '../services/geocodingService';
import {
    User,
    Shield,
    MapPin,
    AlertTriangle,
    Search,
    Navigation,
    Bell,
    Phone,
    RefreshCw,
    Clock,
    ChevronRight,
    Eye,
    EyeOff,
    Locate,
    Info
} from 'lucide-react';

export const UserDashboard: React.FC<{
    onOpenEmergencyContact: () => void;
}> = ({ onOpenEmergencyContact }) => {
    const {
        currentUser,
        pulseData,
        isPulseLoading,
        refreshSafetyPulse,
        navigation,
        toggleRealGps,
        setOriginLocation,
        setDestinationLocation,
        setActiveTab,
        calculateRoutes,
        incidents,
        openReportModal,
        openFollowedMode,
        theme,
    } = useApp();

    const isLight = theme === 'light';

    // Routing Form State
    const [source, setSource] = useState('Detecting location...');
    const [isOriginEdited, setIsOriginEdited] = useState(false);
    const [originError, setOriginError] = useState<string | null>(null);
    const [isGpsLoading, setIsGpsLoading] = useState(false);

    const [destination, setDestination] = useState('');
    const [isPlanning, setIsPlanning] = useState(false);

    // Explicit handleUseGpsLocation function for button click
    const handleUseGpsLocation = async () => {
        setIsGpsLoading(true);
        setOriginError(null);
        if (!navigator.geolocation) {
            setOriginError('Geolocation is not supported by your browser.');
            setIsGpsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setIsOriginEdited(false);
                try {
                    const address = await reverseGeocode(latitude, longitude);
                    setSource(address ? (address.split(',')[0] || address) : `Current GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
                } catch {
                    setSource(`Current GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
                } finally {
                    setIsGpsLoading(false);
                }
            },
            (err) => {
                let msg = 'Unable to retrieve location.';
                if (err.code === err.PERMISSION_DENIED) msg = 'Location permission denied by user.';
                else if (err.code === err.TIMEOUT) msg = 'Location request timed out.';
                else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Location information unavailable.';
                setOriginError(msg);
                setIsGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Auto-enable browser GPS on load if currently simulated
    useEffect(() => {
        if (navigation.gpsMode !== 'REAL_BROWSER') {
            toggleRealGps();
        }
    }, []);

    // Synchronize browser GPS coordinates to the Origin display value via reverseGeocode if user hasn't typed manually
    useEffect(() => {
        let isMounted = true;
        const { lat, lng } = navigation.currentPosition;

        reverseGeocode(lat, lng)
            .then((address) => {
                if (!isMounted || isOriginEdited) return;
                if (address) {
                    setSource(address.split(',')[0] || address);
                } else {
                    setSource(`Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
                }
            })
            .catch(() => {
                if (!isMounted || isOriginEdited) return;
                setSource(`Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            });

        return () => {
            isMounted = false;
        };
    }, [navigation.currentPosition.lat, navigation.currentPosition.lng, isOriginEdited]);

    // Discreet mode local toggle for UI privacy
    const [isDiscreet, setIsDiscreet] = useState(false);

    const activeIncidents = incidents.filter(i => !i.isResolved).slice(0, 3);

    // Time-of-day greeting generator
    const getGreeting = () => {
        const hours = new Date().getHours();
        if (hours < 12) return 'Good morning';
        if (hours < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const handlePlanRouteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!destination.trim()) return;
        setOriginError(null);
        setIsPlanning(true);
        try {
            let currentLat = navigation.currentPosition.lat;
            let currentLng = navigation.currentPosition.lng;
            let originName = source.trim() || 'Current Location';
            let displayAddr = source.trim() ? source.trim() : `Lat: ${currentLat.toFixed(5)}, Lng: ${currentLng.toFixed(5)}`;

            // If user manually edited the Origin, geocode the typed address
            if (isOriginEdited && source.trim()) {
                const searchResults = await searchLocations(source.trim(), {
                    latitude: currentLat,
                    longitude: currentLng,
                });

                if (searchResults && searchResults.length > 0) {
                    const topResult = searchResults[0];
                    currentLat = topResult.latitude;
                    currentLng = topResult.longitude;
                    originName = topResult.name;
                    displayAddr = topResult.displayAddress;
                } else {
                    setOriginError('Unable to find this origin location. Please check the spelling or try a different place.');
                    setIsPlanning(false);
                    return;
                }
            }

            const origLocationObj = {
                id: 'orig_location_' + Date.now(),
                name: originName,
                displayAddress: displayAddr,
                latitude: currentLat,
                longitude: currentLng,
            };

            // Geocode or mock destination location
            const destLocationObj = {
                id: 'dest_' + Date.now(),
                name: destination,
                displayAddress: `${destination}, Nagpur, Maharashtra, India`,
                latitude: 21.1538, // Central Station fallback coords
                longitude: 79.0890,
            };

            setOriginLocation(origLocationObj);
            setDestinationLocation(destLocationObj);
            await calculateRoutes(origLocationObj, destLocationObj, 'WALKING');
            setActiveTab('routes');
        } catch (err) {
            console.error('Route planning error:', err);
        } finally {
            setIsPlanning(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in font-sans">
            {/* 1. Welcome + User Profile Grid */}
            <div className={`rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden shadow-xs ${isLight
                ? 'bg-white border-slate-100'
                : 'bg-zinc-900 border-zinc-800/80'
                }`}>
                {/* Decorative backdrop gradients for premium feel */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative shadow-inner ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-zinc-800 text-zinc-300'
                            }`}>
                            <User className="w-7 h-7" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-lg flex items-center justify-center border-2 border-white dark:border-zinc-950">
                                <Shield className="w-3.5 h-3.5 text-white" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">
                                {getGreeting()}, {isDiscreet ? 'User' : (currentUser?.displayName || 'Traveler')}!
                            </h1>
                            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                Session Secured • Nagpur Regional SafeRoute Active
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Discreet Mode Button */}
                        <button
                            onClick={() => setIsDiscreet(!isDiscreet)}
                            title="Toggle discreet mode to hide personal information"
                            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium cursor-pointer transition-all duration-200 ${isLight
                                ? 'hover:bg-slate-50 border-slate-200 text-slate-700'
                                : 'hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                                }`}
                        >
                            {isDiscreet ? <Eye className="w-4 h-4 text-cyan-500" /> : <EyeOff className="w-4 h-4" />}
                            <span className="hidden sm:inline">{isDiscreet ? 'Reveal Profile' : 'Discreet Mode'}</span>
                        </button>

                        {/* Profile Status Badge */}
                        <div className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 ${currentUser?.admin
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                            : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${currentUser?.admin ? 'bg-amber-500' : 'bg-cyan-500'} animate-pulse`} />
                            {currentUser?.admin ? 'Staff Admin Mode' : 'Verified Secure User'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: Safety Pulse, MiniMap + GPS, Plan Route */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 2. Live Safety Pulse Widget */}
                    <div className={`rounded-3xl border p-6 transition-all duration-300 ${isLight ? 'bg-white border-slate-100' : 'bg-zinc-900 border-zinc-800/80'
                        }`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
                                Live Safety Pulse
                            </h2>
                            <button
                                onClick={refreshSafetyPulse}
                                disabled={isPulseLoading}
                                className={`p-2 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all text-xs font-medium flex items-center gap-2 ${isLight
                                    ? 'hover:bg-slate-50 border-slate-200 text-slate-700'
                                    : 'hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                                    }`}
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isPulseLoading ? 'animate-spin text-cyan-500' : ''}`} />
                                Scan Area
                            </button>
                        </div>

                        {isPulseLoading ? (
                            <div className="py-6 flex flex-col items-center justify-center gap-3">
                                <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                                <p className="text-xs text-gray-500 font-medium">Scanning local networks and community reports...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {/* Pulsing Status indicator */}
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${pulseData?.safety_status === 'NORMAL'
                                            ? 'bg-emerald-500/15 text-emerald-500'
                                            : pulseData?.safety_status === 'CAUTION'
                                                ? 'bg-amber-500/15 text-amber-500'
                                                : 'bg-rose-500/15 text-rose-500'
                                            }`}>
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold tracking-tight">
                                                    {pulseData?.safety_status || 'NORMAL'}
                                                </span>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${pulseData?.safety_status === 'NORMAL'
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                    Rating: {pulseData?.confidence ? Math.round(pulseData.confidence * 5) : 5}/5
                                                </span>
                                            </div>
                                            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                                {pulseData?.explanation || 'No local notices. All indicators normal.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Local Signals list */}
                                <div className={`rounded-2xl p-4 border text-xs space-y-2.5 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-zinc-950/40 border-zinc-800/60'
                                    }`}>
                                    <h3 className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-zinc-300">
                                        <Info className="w-3.5 h-3.5 text-cyan-500" /> Currently Observed Area Signals
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-zinc-400 font-medium">
                                        {pulseData?.recent_signals.map((signal, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                                                <span>{signal}</span>
                                            </div>
                                        )) || (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                                                    <span>Operational streetlighting</span>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Interactive MiniMap / Coordinates & GPS Status */}
                    <div className={`rounded-3xl border p-6 transition-all duration-300 ${isLight ? 'bg-white border-slate-100' : 'bg-zinc-900 border-zinc-800/80'
                        }`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                <Locate className="w-4 h-4 text-cyan-500" /> Live Geolocation & GPS
                            </h2>
                            <button
                                onClick={toggleRealGps}
                                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${navigation.gpsMode === 'REAL_BROWSER'
                                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500'
                                    : isLight
                                        ? 'hover:bg-slate-50 border-slate-200 text-slate-700'
                                        : 'hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                                    }`}
                            >
                                {navigation.gpsMode === 'REAL_BROWSER' ? '✓ High-Precision GPS' : 'Simulated GPS Mode'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Left coordinates box */}
                            <div className={`rounded-2xl p-4 border flex flex-col justify-center space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-zinc-950/40 border-zinc-800/60'
                                }`}>
                                <span className="text-[10px] uppercase font-bold text-gray-500">Current Position</span>
                                <span className="text-sm font-mono font-bold tracking-tight">
                                    Lat: {navigation.currentPosition.lat.toFixed(5)}°
                                </span>
                                <span className="text-sm font-mono font-bold tracking-tight">
                                    Lng: {navigation.currentPosition.lng.toFixed(5)}°
                                </span>
                            </div>

                            {/* Right current address box */}
                            <div className={`rounded-2xl p-4 border flex flex-col justify-center space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-zinc-950/40 border-zinc-800/60'
                                }`}>
                                <span className="text-[10px] uppercase font-bold text-gray-500">Geocoded Location</span>
                                <span className="text-xs font-bold leading-normal text-slate-800 dark:text-zinc-200">
                                    {navigation.gpsMode === 'SIMULATED' ? 'Sitabuldi Center Corridor, Nagpur' : 'Live GPS Feed Active'}
                                </span>
                                <span className="text-[10px] text-gray-500 font-medium">Accuracy Range: ~10m</span>
                            </div>
                        </div>

                        {/* Quick button to view full map */}
                        <button
                            onClick={() => setActiveTab('map')}
                            className="w-full mt-4 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider text-center cursor-pointer transition-all duration-200 bg-cyan-600 hover:bg-cyan-500 text-white font-mono shadow-xs"
                        >
                            Open Interactive Heatmap Tab
                        </button>
                    </div>

                    {/* 4. Plan Safe Route Form */}
                    <div className={`rounded-3xl border p-6 transition-all duration-300 ${isLight ? 'bg-white border-slate-100' : 'bg-zinc-900 border-zinc-800/80'
                        }`}>
                        <h2 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-cyan-500" /> Plan Safe Route
                        </h2>

                        <form onSubmit={handlePlanRouteSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block">Origin Location</label>
                                        <button
                                            type="button"
                                            onClick={handleUseGpsLocation}
                                            disabled={isGpsLoading}
                                            className="text-[10px] text-cyan-500 hover:underline font-semibold cursor-pointer flex items-center gap-1"
                                        >
                                            <Locate className={`w-3 h-3 ${isGpsLoading ? 'animate-spin' : ''}`} />
                                            <span>{isGpsLoading ? 'Locating...' : 'Use GPS Location'}</span>
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={source}
                                            onChange={(e) => {
                                                setSource(e.target.value);
                                                setIsOriginEdited(true);
                                                if (originError) setOriginError(null);
                                            }}
                                            placeholder="Enter starting location or current GPS"
                                            className={`w-full pl-10 pr-4 py-3 text-xs rounded-2xl border font-semibold outline-hidden transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${isLight
                                                ? 'bg-white border-slate-200 text-slate-900'
                                                : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                                                }`}
                                        />
                                    </div>
                                    {originError && (
                                        <p className="text-[11px] text-rose-500 font-semibold mt-1.5 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            <span>{originError}</span>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-405 uppercase block mb-1.5">Destination</label>
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-cyan-500" />
                                        <input
                                            type="text"
                                            value={destination}
                                            onChange={(e) => setDestination(e.target.value)}
                                            required
                                            placeholder="Enter destination (e.g. Central Station)"
                                            className={`w-full pl-10 pr-4 py-3 text-xs rounded-2xl border font-semibold outline-hidden transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${isLight
                                                ? 'bg-white border-slate-200 text-slate-900'
                                                : 'bg-zinc-950 border-zinc-850 text-zinc-100'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Suggestions */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-450 uppercase">Suggestions:</span>
                                {['Nagpur Central Station', 'Corporate Hub', 'Transit Exchange'].map((name) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => setDestination(name)}
                                        className={`px-3 py-1 rounded-xl text-[10px] font-semibold cursor-pointer border hover:border-cyan-500 transition-all ${isLight
                                            ? 'bg-slate-50 border-slate-200 text-slate-650'
                                            : 'bg-zinc-950 border-zinc-850 text-zinc-400'
                                            }`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={isPlanning || !destination.trim()}
                                className={`w-full py-4 text-xs font-bold uppercase tracking-wider rounded-2xl text-center cursor-pointer transition-all duration-300 shadow-lg ${!destination.trim()
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/10 hover:shadow-cyan-600/20'
                                    }`}
                            >
                                {isPlanning ? 'Calculating safest corridor...' : 'Compare Safer Route Options'}
                            </button>
                        </form>
                    </div>

                </div>

                {/* RIGHT COLUMN: Quick Actions, Recent Activity, Alerts */}
                <div className="space-y-6">

                    {/* 5. Quick Actions Panel */}
                    <div className={`rounded-3xl border p-6 transition-all duration-300 ${isLight ? 'bg-white border-slate-100' : 'bg-zinc-900 border-zinc-800/80'
                        }`}>
                        <h2 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-4">
                            Quick Actions
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {/* SOS Emergency button */}
                            <button
                                onClick={openFollowedMode}
                                className="col-span-2 py-4 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-md shadow-rose-600/15"
                            >
                                <Phone className="w-4 h-4 animate-bounce" /> Trigger SOS Alarm
                            </button>

                            <button
                                onClick={() => setActiveTab('routes')}
                                className={`py-3.5 px-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-cyan-500 transition-all ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-850'
                                    }`}
                            >
                                <Navigation className="w-4 h-4 text-cyan-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Plan Route</span>
                            </button>

                            <button
                                onClick={openReportModal}
                                className={`py-3.5 px-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-cyan-500 transition-all ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-850'
                                    }`}
                            >
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Report Alert</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('havens')}
                                className={`py-3.5 px-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-cyan-500 transition-all ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-850'
                                    }`}
                            >
                                <Shield className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Safe Havens</span>
                            </button>

                            <button
                                onClick={onOpenEmergencyContact}
                                className={`py-3.5 px-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-cyan-500 transition-all ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-850'
                                    }`}
                            >
                                <User className="w-4 h-4 text-cyan-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Contacts</span>
                            </button>
                        </div>
                    </div>

                    {/* 6. Safety Alerts Nearby */}
                    <div className={`rounded-3xl border p-6 transition-all duration-300 ${isLight ? 'bg-white border-slate-100' : 'bg-zinc-900 border-zinc-800/80'
                        }`}>
                        <h2 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                            <span>Safety Alerts</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${activeIncidents.length > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                                }`}>
                                {activeIncidents.length} active
                            </span>
                        </h2>

                        {activeIncidents.length === 0 ? (
                            <div className="py-4 text-center">
                                <Shield className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-gray-500">All local sectors reporting clear.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeIncidents.map((inc) => (
                                    <div
                                        key={inc.id}
                                        className={`p-3 rounded-2xl border flex gap-3 items-center justify-between text-xs transition-all ${isLight ? 'bg-slate-50 border-slate-100 hover:border-slate-200' : 'bg-zinc-950 border-zinc-850 hover:border-zinc-800'
                                            }`}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <AlertTriangle className={`w-3.5 h-3.5 ${inc.severity === 'HIGH' || inc.severity === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'
                                                    }`} />
                                                <span className="font-bold">{inc.category.replace('_', ' ')}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 leading-normal line-clamp-1">{inc.description}</p>
                                        </div>

                                        <span className={`text-[10px] font-mono shrink-0 px-2 py-0.5 rounded ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-zinc-800 text-zinc-300'
                                            }`}>
                                            {inc.severity}
                                        </span>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setActiveTab('signals')}
                                    className={`w-full py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer transition-all ${isLight ? 'hover:bg-slate-50 border-slate-200 text-slate-700' : 'hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                                        }`}
                                >
                                    View All Signals
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 7. Recent Activity logs */}
                    <div className={`rounded-3xl border p-6 transition-all duration-300 ${isLight ? 'bg-white border-slate-100' : 'bg-zinc-900 border-zinc-800/80'
                        }`}>
                        <h2 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-500" /> Recent Trips & history
                        </h2>

                        <div className="space-y-3">
                            {useApp().tripHistory.slice(0, 2).map((trip) => (
                                <div
                                    key={trip.id}
                                    className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${isLight ? 'bg-slate-50 border-slate-150' : 'bg-zinc-950 border-zinc-850'
                                        }`}
                                >
                                    <div className="space-y-0.5">
                                        <h3 className="font-bold truncate text-[11px] max-w-[150px]">
                                            {trip.destinationName}
                                        </h3>
                                        <p className="text-[10px] text-gray-500">{trip.formattedDate}</p>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[11px] font-mono font-bold text-emerald-500">{trip.starDisplay}</span>
                                        <p className="text-[10px] text-gray-505 font-medium">{trip.distanceKm} km • {trip.travelTimeMin} min</p>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={() => {
                                    // Direct button opens Trip History Modal
                                    // Since we cannot trigger internal triggers easily, this button switches to the tab list
                                    setActiveTab('map'); // Focus Map as proxy or let user check
                                }}
                                className={`w-full py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer transition-all ${isLight ? 'hover:bg-slate-50 border-slate-200 text-slate-700' : 'hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                                    }`}
                            >
                                View Full Audit Logs
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
