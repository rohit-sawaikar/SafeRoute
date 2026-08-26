import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Radio,
  ThumbsUp,
  CheckCircle2,
  User,
  Sparkles,
  Car,
  AlertTriangle,
  Lock,
  Sun,
  Flame,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  options?: Array<{ id: string; label: string }>;
}

export const ReviewBotChat: React.FC = () => {
  const {
    incidents,
    corroborateIncident,
    disputeIncident,
    resolveIncident,
    openReportModal,
    originLocation,
    currentUser,
    openAuthModal,
    theme,
  } = useApp();

  const isLight = theme === 'light';
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeIncidents = incidents.filter((i) => !i.isResolved);

  // Initialize chatbot dialog
  useEffect(() => {
    if (messages.length === 0) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        const greeting = getGreetingMessage();
        setMessages([greeting]);
        setIsTyping(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getGreetingMessage = (): ChatMessage => {
    // Check if there is an active incident near origin / Nagpur center
    const userLat = originLocation?.latitude || 21.1458;
    const userLng = originLocation?.longitude || 79.0882;
    
    // Find closest active incident
    let closestIncident: any = null;
    let minDist = Infinity;
    
    activeIncidents.forEach((inc) => {
      const dLat = userLat - inc.location.lat;
      const dLng = userLng - inc.location.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
      if (dist < minDist) {
        minDist = dist;
        closestIncident = inc;
      }
    });

    if (closestIncident && minDist <= 500) {
      return {
        id: 'greet_inc',
        sender: 'bot',
        text: `Hi! I'm SafeRoute's AI review bot. 🕵️‍♂️ I notice you are near a reported safety concern: "${closestIncident.category.replace('_', ' ')}" on ${closestIncident.location.name}. Can you verify if this is still active?`,
        options: [
          { id: `CONFIRM_${closestIncident.id}`, label: 'Yes, it is active (Confirm)' },
          { id: `RESOLVED_${closestIncident.id}`, label: 'No, it is cleared now' },
          { id: 'NOT_SURE', label: 'Not sure / Did not see' },
        ],
      };
    }

    return {
      id: 'greet_clear',
      sender: 'bot',
      text: "Hi! I'm SafeRoute's AI review bot. 🕵️‍♂️ Nagpur looks clear on our maps right now. Did you notice any active road hazards, accidents, or other inconveniences?",
      options: [
        { id: 'REPORT_ACCIDENT', label: 'Spot Accident' },
        { id: 'REPORT_CONSTRUCTION', label: 'Spot Construction' },
        { id: 'REPORT_BLOCKAGE', label: 'Spot Blockage' },
        { id: 'CLEAR', label: 'All looks clear!' },
      ],
    };
  };

  const handleOptionClick = async (optionId: string, label: string) => {
    // Add user response message
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: label,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Require sign-in for interactive operations
    if (!currentUser && optionId !== 'CLEAR' && optionId !== 'NOT_SURE') {
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_auth_${Date.now()}`,
            sender: 'bot',
            text: 'You need to be signed in to submit safety check signals. Please log in first!',
          },
        ]);
        openAuthModal();
      }, 700);
      return;
    }

    setTimeout(async () => {
      let botText = '';
      if (optionId.startsWith('CONFIRM_')) {
        const incId = optionId.replace('CONFIRM_', '');
        await corroborateIncident(incId);
        botText = 'Thank you! Your feedback corroborates this safety report. I have updated the map reliability! 🛡️';
      } else if (optionId.startsWith('RESOLVED_')) {
        const incId = optionId.replace('RESOLVED_', '');
        await resolveIncident(incId);
        botText = "Excellent! I have marked this issue as resolved. Thank you for keeping Nagpur's maps up to date! 🌟";
      } else if (optionId === 'NOT_SURE') {
        botText = 'No problem! Safe travels and maintain normal awareness. 🚶‍♀️';
      } else if (optionId.startsWith('REPORT_')) {
        openReportModal();
        botText = "Sure! I've opened the report modal so you can enter the location and upload photo proof. 📸";
      } else if (optionId === 'CLEAR') {
        botText = 'Wonderful! Have a safe and pleasant journey! 🚙';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: botText,
        },
      ]);
      setIsTyping(false);
    }, 900);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: inputValue.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const textLower = inputValue.toLowerCase().trim();
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      let responseText = "I'm the community review bot. Click one of the quick options or select 'Spot' to report new issues!";
      let options: ChatMessage['options'] = [
        { id: 'REPORT_ACCIDENT', label: 'Spot Accident' },
        { id: 'REPORT_CONSTRUCTION', label: 'Spot Construction' },
        { id: 'CLEAR', label: 'All looks clear!' },
      ];

      if (textLower.includes('accident') || textLower.includes('crash')) {
        openReportModal();
        responseText = "I've opened the incident reporting portal for you. You can report the accident with photo proof there! 🚨";
        options = undefined;
      } else if (textLower.includes('streetlight') || textLower.includes('dark')) {
        openReportModal();
        responseText = "I've opened the report portal for you. Standard safety policy requires a description to register streetlight issues.";
        options = undefined;
      } else if (textLower.includes('clear') || textLower.includes('safe') || textLower.includes('fine')) {
        responseText = 'Fantastic! Nagpur is safe when we watch out for each other. 🛡️';
        options = undefined;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: responseText,
          options,
        },
      ]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end pointer-events-auto">
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div
          className={`w-80 sm:w-88 h-96 rounded-3xl border shadow-2xl flex flex-col overflow-hidden mb-3 animate-in slide-in-from-bottom-5 duration-200 backdrop-blur-lg ${
            isLight ? 'bg-white/95 border-slate-200' : 'bg-zinc-950/95 border-zinc-800'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 border-b flex items-center justify-between bg-cyan-600 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 animate-pulse text-cyan-200" />
              <div>
                <h4 className="font-bold text-xs">SafeRoute Review Bot</h4>
                <span className="text-[9px] text-cyan-100 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Real-time Safety Check</span>
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-cyan-700 transition-colors text-cyan-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center border shrink-0 text-xs ${
                    msg.sender === 'user'
                      ? 'bg-cyan-600/10 text-cyan-600 border-cyan-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-cyan-500 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}
                </div>

                <div className="space-y-1.5">
                  <div
                    className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-cyan-600 text-white rounded-tr-none'
                        : isLight
                        ? 'bg-slate-100 text-slate-800 rounded-tl-none'
                        : 'bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-800'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Quick Action Options */}
                  {msg.options && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleOptionClick(opt.id, opt.label)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-transform active:scale-95 text-left ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 mr-auto max-w-[85%]">
                <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-900 text-cyan-500 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                </div>
                <div
                  className={`rounded-2xl px-3 py-2 text-xs flex items-center gap-1 ${
                    isLight ? 'bg-slate-100 text-slate-500' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <form
            onSubmit={handleSendMessage}
            className={`p-2.5 border-t flex items-center gap-2 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-850'
            }`}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask or verify safety conditions..."
              className={`flex-1 rounded-xl border px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500 transition-colors ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-white'
              }`}
            />
            <button
              type="submit"
              className="p-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow-2xl hover:bg-cyan-500 transition-all hover:scale-105 active:scale-95 duration-150 border border-cyan-500/20"
      >
        {isOpen ? <X className="h-5.5 w-5.5" /> : <MessageSquare className="h-5.5 w-5.5" />}
      </button>
    </div>
  );
};
