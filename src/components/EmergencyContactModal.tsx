/**
 * SafeHeaven Emergency Contact Profile & Management Modal
 * 
 * Provides a calm, trustworthy interface to view, add, or edit the user's
 * primary trusted emergency contact.
 */

import React, { useState } from 'react';
import {
  X,
  Phone,
  User,
  Heart,
  Shield,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Lock,
  PhoneCall,
  Save,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface EmergencyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RELATIONSHIP_OPTIONS = [
  'Parent / Guardian',
  'Partner / Spouse',
  'Friend',
  'Sibling',
  'Roommate',
  'Colleague',
  'Other Trusted Person',
];

export const EmergencyContactModal: React.FC<EmergencyContactModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { emergencyContact, setEmergencyContact, theme } = useApp();

  const [isEditing, setIsEditing] = useState<boolean>(!emergencyContact);
  const [name, setName] = useState<string>(emergencyContact?.name || '');
  const [phone, setPhone] = useState<string>(emergencyContact?.phone || '');
  const [relationship, setRelationship] = useState<string>(
    emergencyContact?.relationship || 'Parent / Guardian'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const validatePhone = (input: string) => {
    const cleaned = input.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage('Please enter the contact person’s name.');
      return;
    }

    if (!validatePhone(phone)) {
      setErrorMessage('Please enter a valid phone number with area code (at least 10 digits).');
      return;
    }

    const updated = {
      name: name.trim(),
      phone: phone.trim(),
      relationship,
    };

    setEmergencyContact(updated);
    setSuccessMessage('Emergency contact saved successfully.');
    setIsEditing(false);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);
  };

  const handleDelete = () => {
    setEmergencyContact(null);
    setName('');
    setPhone('');
    setIsEditing(true);
    setSuccessMessage('Emergency contact removed.');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border p-6 shadow-2xl transition-colors duration-200 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200'
            : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-cyan-950/20'
        }`}
      >
        {/* Header Bar */}
        <div className={`flex items-center justify-between pb-4 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Emergency Contact</h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Your trusted person to reach when you need help
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-colors ${
              isLight ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* VIEW MODE: If Contact Exists & Not Editing */}
        {!isEditing && emergencyContact ? (
          <div className="mt-5 space-y-4">
            <div
              className={`p-4 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/70 border-zinc-800'
              } space-y-3`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                    Primary Trusted Contact
                  </span>
                  <h3 className="text-base font-bold">{emergencyContact.name}</h3>
                  <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                    <Phone className="h-3.5 w-3.5 text-rose-400" />
                    <span className="font-mono font-medium">{emergencyContact.phone}</span>
                  </div>
                  {emergencyContact.relationship && (
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      }`}
                    >
                      {emergencyContact.relationship}
                    </span>
                  )}
                </div>

                <a
                  href={`tel:${emergencyContact.phone.replace(/\D/g, '')}`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-transform active:scale-95"
                  title="Call Emergency Contact"
                >
                  <PhoneCall className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleDelete}
                className={`text-xs flex items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                  isLight ? 'text-rose-600 hover:bg-rose-50' : 'text-rose-400 hover:bg-rose-950/40'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Contact</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setName(emergencyContact.name);
                  setPhone(emergencyContact.phone);
                  setRelationship(emergencyContact.relationship || 'Parent / Guardian');
                  setIsEditing(true);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                }`}
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Details</span>
              </button>
            </div>
          </div>
        ) : (
          /* EDIT / ADD FORM MODE */
          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Contact Name
              </label>
              <div className="relative">
                <User className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className={`w-full rounded-xl border pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                      : 'bg-zinc-900 border-zinc-800 text-white focus:border-rose-500'
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Phone Number
              </label>
              <div className="relative">
                <Phone className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 234-5678"
                  className={`w-full rounded-xl border pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                      : 'bg-zinc-900 border-zinc-800 text-white focus:border-rose-500'
                  }`}
                  required
                />
              </div>
              <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Include your country / area code for direct emergency calling.
              </p>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Relationship (Optional)
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                    : 'bg-zinc-900 border-zinc-800 text-white focus:border-rose-500'
                }`}
              >
                {RELATIONSHIP_OPTIONS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            </div>

            {/* Privacy Disclaimer */}
            <div
              className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
              }`}
            >
              <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Contact details remain strictly private on your device.</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
              {emergencyContact && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`px-4 py-2 rounded-xl text-xs transition-colors ${
                    isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors active:scale-95"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Emergency Contact</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
