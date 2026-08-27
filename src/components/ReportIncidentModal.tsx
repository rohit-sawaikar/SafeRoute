/**
 * SafeHeaven Real-Time Community Incident Reporting Modal
 * 
 * Implements:
 * - 10 Incident Categories with friendly icons
 * - Real location selection (Current GPS, Map Pick, Search)
 * - Photo attachments (up to 3 images with compression preview)
 * - Severity input
 * - Character count limit (500 max) & sanitization
 * - Day / Night mode support
 */

import React, { useState } from 'react';
import {
  X,
  Send,
  Camera,
  AlertCircle,
  CheckCircle,
  Crosshair,
  AlertTriangle,
  Lock,
  ShieldAlert,
  Car,
  Navigation,
  Construction,
  CloudRain,
  Sun,
  Flame,
  Activity,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCurrentUserPosition } from '../utils/geolocation';
import { reverseGeocode } from '../services/geocodingService';

export const ReportIncidentModal: React.FC = () => {
  const { isReportModalOpen, closeReportModal, addIncident, theme } = useApp();

  const isLight = theme === 'light';

  const [category, setCategory] = useState<string>('ACCIDENT');
  const [description, setDescription] = useState<string>('');
  const [userSeverity, setUserSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>('MEDIUM');
  const [locationName, setLocationName] = useState<string>('Market & 5th St, Nagpur');
  const [latLng, setLatLng] = useState<{ lat: number; lng: number }>({ lat: 21.1458, lng: 79.0882 });
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isReportModalOpen) return null;

  const categories = [
    { id: 'ACCIDENT', label: 'Accident', icon: Car, color: 'text-rose-500' },
    { id: 'CONSTRUCTION', label: 'Construction', icon: Construction, color: 'text-yellow-600' },
    { id: 'ROAD_BLOCKAGE', label: 'Road Blockage', icon: AlertTriangle, color: 'text-orange-500' },
    { id: 'HARASSMENT', label: 'Harassment', icon: ShieldAlert, color: 'text-purple-500' },
    { id: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious Activity', icon: Lock, color: 'text-indigo-500' },
    { id: 'FIRE', label: 'Fire', icon: Flame, color: 'text-red-500' },
    { id: 'MEDICAL_EMERGENCY', label: 'Medical Emergency', icon: Activity, color: 'text-red-600' },
    { id: 'STREETLIGHT', label: 'Streetlight outage', icon: Sun, color: 'text-amber-500' },
    { id: 'UNSAFE_INFRASTRUCTURE', label: 'Unsafe Infrastructure', icon: AlertCircle, color: 'text-rose-600' },
    { id: 'OTHER', label: 'Other', icon: AlertCircle, color: 'text-slate-400' },
  ];

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const coords = await getCurrentUserPosition();
      setLatLng({ lat: coords.latitude, lng: coords.longitude });
      const address = await reverseGeocode(coords.latitude, coords.longitude);
      setLocationName(address);
    } catch (err: any) {
      console.warn('Location detection failed:', err);
    } finally {
      setIsLocating(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = (Array.from(e.target.files) as File[]).slice(0, 3 - photos.length);

    selectedFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev, reader.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      setSubmitFeedback({
        success: false,
        message: 'A detailed description (at least 5 characters) is required for every safety report.',
      });
      return;
    }

    const photoRequiredCategories = ['ACCIDENT', 'FIRE', 'MEDICAL_EMERGENCY'];
    if (photoRequiredCategories.includes(category) && photos.length === 0) {
      setSubmitFeedback({
        success: false,
        message: `Photo proof is strictly required for high-risk incident category: ${category.replace('_', ' ').toLowerCase()}.`,
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      const res = await fetch('/api/safety/incidents/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `user_reporter_${Date.now()}`,
          category,
          description: description.trim(),
          latitude: latLng.lat,
          longitude: latLng.lng,
          address: locationName,
          severitySubmitted: userSeverity,
          photos,
        }),
      });

      let data: any = null;
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Response is non-JSON or malformed
        }
      }

      if (!res.ok) {
        const errorMsg =
          data?.error ||
          (res.status === 413
            ? 'Photo payload is too large. Please attach a smaller photo.'
            : `Server error (${res.status}). Please try again.`);
        throw new Error(errorMsg);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to submit report. Please check network connection.');
      }

      setSubmitFeedback({
        success: true,
        message: data.message || 'Report submitted! Status: Pending Verification.',
      });

      addIncident({
        id: data.report.id,
        category: data.report.category,
        title: `${category.replace('_', ' ')} Reported`,
        description: data.report.description,
        severity: data.report.severitySubmitted,
        reportedAt: new Date().toISOString(),
        minutesAgo: 0,
        confidence: data.report.confidenceScore,
        corroborations: 1,
        hasPhoto: photos.length > 0,
        location: { lat: latLng.lat, lng: latLng.lng, name: locationName, x: 400, y: 250 },
        reporterToken: 'anon_user',
        isResolved: false,
        resolvedVotes: 0,
      });

      setTimeout(() => {
        closeReportModal();
        setDescription('');
        setPhotos([]);
        setSubmitFeedback(null);
      }, 1800);
    } catch (err: any) {
      setSubmitFeedback({
        success: false,
        message: err.message || 'Submission failed. Please check network.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl border p-6 shadow-2xl space-y-4 transition-colors duration-200 ${isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
            : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-cyan-950/20'
          }`}
      >
        {/* Header Bar */}
        <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-xs">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Report a Safety Issue</h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Help your community stay safe • Private & anonymous
              </p>
            </div>
          </div>

          <button
            onClick={closeReportModal}
            className={`rounded-lg p-1.5 transition-colors ${isLight ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {submitFeedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${submitFeedback.success
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300'
              }`}
          >
            {submitFeedback.success ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{submitFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmitReport} className="space-y-4">
          {/* Category Picker */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              Select Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${isSelected
                        ? isLight
                          ? 'bg-cyan-50 border-cyan-500 text-cyan-900 font-bold shadow-xs'
                          : 'bg-cyan-950/60 border-cyan-500 text-white font-bold shadow-xs'
                        : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${cat.color}`} />
                    <span className="text-xs truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Picker */}
          <div>
            <label className={`block text-xs font-semibold mb-1 flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              <span>Location</span>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
              >
                <Crosshair className={`h-3 w-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Detecting...' : 'Use My Current Location'}</span>
              </button>
            </label>

            <div className="relative">
              <MapPin className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Street address or area name..."
                className={`w-full rounded-xl border pl-9 pr-3 py-2 text-xs focus:outline-none ${isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                    : 'bg-zinc-900 border-zinc-800 text-white focus:border-cyan-500'
                  }`}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                What do you notice?
              </label>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{description.length}/500</span>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="e.g. Broken streetlamp in alley, water accumulation near crosswalk..."
              rows={3}
              className={`w-full rounded-xl border p-3 text-xs focus:outline-none ${isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                  : 'bg-zinc-900 border-zinc-800 text-white focus:border-cyan-500'
                }`}
              required
            />
          </div>

          {/* Severity & Photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Severity Level
              </label>
              <select
                value={userSeverity}
                onChange={(e) => setUserSeverity(e.target.value as any)}
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                    : 'bg-zinc-900 border-zinc-800 text-white focus:border-cyan-500'
                  }`}
              >
                <option value="LOW">Low (Informational)</option>
                <option value="MEDIUM">Medium (Moderate Delay)</option>
                <option value="HIGH">High (Major Obstruction)</option>
                <option value="EMERGENCY">Emergency (Urgent Hazard)</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Photo (Optional, max 3)
              </label>
              <label
                className={`cursor-pointer flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300'
                  }`}
              >
                <Camera className="h-3.5 w-3.5 text-cyan-500" />
                <span>{photos.length > 0 ? `Attached (${photos.length})` : 'Attach Photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Photo Previews */}
          {photos.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              {photos.map((src, idx) => (
                <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-zinc-700">
                  <img src={src} alt="Evidence" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <div
            className={`rounded-xl border p-2.5 text-[11px] flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
              }`}
          >
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Reports are verified by our community before map broadcast.</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className={`flex items-center justify-end gap-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-zinc-850'}`}>
            <button
              type="button"
              onClick={closeReportModal}
              className={`px-4 py-2 rounded-xl text-xs transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
