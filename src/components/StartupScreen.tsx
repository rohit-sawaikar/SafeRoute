import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Navigation } from 'lucide-react';

interface StartupScreenProps {
  onComplete: () => void;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Initializing navigation system...');

  useEffect(() => {
    // Dynamic status text transitions
    const statusInterval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 4, 100);
        if (next < 25) {
          setStatusText('Initializing navigation system...');
        } else if (next < 50) {
          setStatusText('Checking your safety environment...');
        } else if (next < 75) {
          setStatusText('Analyzing community incident reports...');
        } else if (next < 95) {
          setStatusText('Locating nearby emergency places...');
        } else {
          setStatusText('Ready.');
        }
        return next;
      });
    }, 100);

    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => {
        onComplete();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      {/* Background Scanning Radar Grid Effect */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
        {/* Pulsing radar circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-cyan-500/20 animate-[ping_4s_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-cyan-500/10 animate-[ping_6s_infinite]" />
      </div>

      <div className="relative flex flex-col items-center max-w-sm w-full text-center space-y-8 z-10">
        {/* Glowing Shield Logo Panel */}
        <div className="relative flex items-center justify-center">
          {/* Ripple rings */}
          <div className="absolute h-24 w-24 rounded-full bg-cyan-600/10 border border-cyan-500/20 animate-ping duration-1000" />
          <div className="absolute h-32 w-32 rounded-full bg-cyan-600/5 border border-cyan-500/10 animate-ping duration-1500" />
          
          <div className="relative h-16 w-16 rounded-2xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shadow-2xl shadow-cyan-950">
            <Shield className="h-9 w-9 animate-pulse" />
          </div>
        </div>

        {/* Brand Labels */}
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>🛡️ SafeRoute</span>
          </h2>
          <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Real-Time Safety Navigation</span>
          </p>
        </div>

        {/* Loading Progress Section */}
        <div className="w-full space-y-3.5 pt-6">
          <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
            <span className="animate-pulse">{statusText}</span>
            <span className="font-bold text-cyan-400">{progress}%</span>
          </div>

          {/* Progress Bar Track */}
          <div className="h-1.5 w-full rounded-full bg-zinc-900 border border-zinc-800/80 overflow-hidden p-[1px]">
            <div
              style={{ width: `${progress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-indigo-500 shadow-md shadow-cyan-500/50 transition-all duration-100 ease-out"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
