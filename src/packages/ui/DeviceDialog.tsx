import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiSmartphone, FiLink } from 'react-icons/fi';
import { twMerge } from 'tailwind-merge';
import { invoke } from '@tauri-apps/api/core';

interface DeviceInfo {
  serial: string;
  status: string;
  model: string | null;
  product: string | null;
  transport_id: string | null;
  usb: string | null;
}

interface DeviceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceInfo[];
  adbProxySerials: string[];
  followRun: boolean;
  isRun: boolean;
  onFollowRunChange: (value: boolean) => void;
  onSerialsChange: (serials: string[]) => void;
}

export const DeviceDialog: React.FC<DeviceDialogProps> = ({
  isOpen,
  onClose,
  devices,
  adbProxySerials,
  followRun,
  isRun,
  onFollowRunChange,
  onSerialsChange,
}) => {
  if (!isOpen) return null;

  const handleRefresh = () => {
    invoke<DeviceInfo[]>('detect_devices');
    invoke<string[]>('get_adb_proxy_serials').then(onSerialsChange);
  };

  const handleToggleProxy = (serial: string, active: boolean) => {
    const cmd = active ? 'adb_device_stop_proxy' : 'adb_device_start_proxy';
    invoke(cmd, { serial }).then(() =>
      invoke<string[]>('get_adb_proxy_serials').then(onSerialsChange)
    ).catch(console.error);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-[420px] bg-[#1a1a1a] border border-zinc-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Connected Devices</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
            <FiX size={16} />
          </button>
        </div>

        {/* Follow Run Toggle */}
        <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <FiLink size={14} className={followRun ? "text-blue-400" : "text-zinc-600"} />
            <span className="text-xs font-bold text-zinc-300">Follow Run</span>
          </div>
          <button
            onClick={() => onFollowRunChange(!followRun)}
            className={twMerge(
              "relative w-10 h-5 rounded-full transition-colors overflow-hidden",
              followRun ? "bg-blue-600" : "bg-zinc-700"
            )}
          >
            <span className={twMerge(
              "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
              followRun ? "left-[22px]" : "left-0.5"
            )} />
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-zinc-500">
            <FiSmartphone size={32} className="opacity-40" />
            <p className="text-xs font-medium">No devices detected</p>
            <p className="text-[10px] text-zinc-600">Connect an Android device via USB and enable USB debugging</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {devices.map((device) => {
              const isActive = adbProxySerials.includes(device.serial);
              return (
                <div
                  key={device.serial}
                  onClick={() => invoke('open_new_window', { context: 'certificate-installer?tab=android-device', title: 'Certificate Installer' })}
                  className={twMerge(
                    "flex items-center gap-3 bg-zinc-900 border rounded-xl px-4 py-3 cursor-pointer hover:bg-zinc-800/80 transition-colors",
                    isActive ? "border-emerald-500/20" : "border-zinc-800"
                  )}
                >
                  <span className={twMerge(
                    "w-2 h-2 rounded-full shrink-0",
                    device.status === 'device'
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "bg-zinc-600"
                  )} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-zinc-200 truncate">
                      {device.model || device.serial}
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate">
                      {device.serial}{device.product ? ` - ${device.product}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {followRun ? (
                      <span className={twMerge(
                        "text-[10px] font-bold uppercase tracking-wider",
                        isRun ? "text-emerald-500" : "text-zinc-500"
                      )}>
                        {isRun ? "Active" : "Inactive"}
                      </span>
                    ) : device.status === 'device' ? (
                      <button
                        onClick={() => handleToggleProxy(device.serial, isActive)}
                        className={twMerge(
                          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                          isActive
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                        )}
                      >
                        {isActive ? "Stop" : "Start"}
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        {device.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
