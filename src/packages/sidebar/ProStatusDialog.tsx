import React from 'react';
import { createPortal } from 'react-dom';
import { FiStar, FiZap, FiTarget, FiBox } from 'react-icons/fi';
import { useLicense } from '../../hooks/useLicense';

interface ProStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProStatusDialog: React.FC<ProStatusDialogProps> = ({ isOpen, onClose }) => {
  const { isPro } = useLicense();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-lg bg-[#111111] border border-zinc-800 rounded-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] p-8 flex flex-col gap-8 animate-in zoom-in-95 duration-300 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-600/20 blur-[100px] pointer-events-none" />

        <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
                <FiStar size={32} className="text-white fill-white/20" />
            </div>
            
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">
                {isPro ? 'Professional Active' : 'Upgrade to Pro'}
            </h2>
            <p className="text-zinc-500 text-sm max-w-xs">
                {isPro 
                    ? 'Thank you for supporting NetworkSpy! You have full access to all elite features.' 
                    : 'Unlock the full power of NetworkSpy with a professional license.'}
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureItem icon={<FiZap />} title="Unlimited Traffic" desc="No caps on request volume or speed." />
            <FeatureItem icon={<FiBox />} title="Cloud Workspaces" desc="Sync research across all your devices." />
            <FeatureItem icon={<FiTarget />} title="Advanced AI" desc="Deep protocol analysis & auto-decoding." />
            <FeatureItem icon={<FiShield />} title="Commercial Use" desc="License for enterprise environments." />
        </div>

        <div className="flex flex-col gap-3">
            <button 
                onClick={onClose}
                className="w-full py-4 bg-white text-black font-black text-xs tracking-widest uppercase rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg"
            >
                {isPro ? 'Close Panel' : 'Upgrade to Pro — $19/mo'}
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const FeatureItem = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
        <div className="mt-1 text-blue-500">{icon}</div>
        <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-zinc-100">{title}</span>
            <span className="text-[10px] text-zinc-500 leading-tight">{desc}</span>
        </div>
    </div>
);

const FiShield = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
);
