import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiDownload, FiArrowUp } from 'react-icons/fi';
import { open } from '@tauri-apps/plugin-shell';

interface UpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  latestVersion: string;
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  isOpen,
  onClose,
  currentVersion,
  latestVersion,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-[380px] bg-[#1a1a1a] border border-zinc-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <FiArrowUp className="text-amber-400" size={16} />
            </div>
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Update Available</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
            <FiX size={16} />
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Current</span>
            <span className="text-xs font-bold text-zinc-400">{currentVersion}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Latest</span>
            <span className="text-xs font-bold text-amber-400">{latestVersion}</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          A new version of NetworkSpy is available. Download the latest release to get new features and bug fixes.
        </p>

        <button
          onClick={async () => {
            try {
              await open('https://networkspy.app/download');
            } catch {
              window.open('https://networkspy.app/download', '_blank');
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-all"
        >
          <FiDownload size={14} />
          Download Update
        </button>
      </div>
    </div>,
    document.body
  );
};
