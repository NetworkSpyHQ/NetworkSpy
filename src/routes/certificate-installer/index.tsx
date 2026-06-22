import { useState, ReactNode, useMemo, useEffect } from "react";
import { type } from "@tauri-apps/plugin-os";
import { FiSearch, FiMonitor } from "react-icons/fi";
import { twMerge } from "tailwind-merge";

import { WindowsInstaller } from "./computer/Windows";
import { MacOSInstaller } from "./computer/Mac";
import { LinuxInstaller } from "./computer/Linux";
import { AndroidDeviceInstaller } from "./mobile/AndroidDevice";
import { AndroidEmulatorInstaller } from "./mobile/AndroidEmulator";
import { IOSDeviceInstaller } from "./mobile/iOSDevice";
import { IOSSimulatorInstaller } from "./mobile/iOSSimulator";
import { DockerInstaller } from "./vm/Docker";
import { VirtualBoxInstaller } from "./vm/VirtualBox";
import { VMWareInstaller } from "./vm/VMWare";
import { KVMInstaller } from "./vm/KVM";
import { PythonInstaller } from "./development/Python";
import { NodeInstaller } from "./development/Node";
import { GoInstaller } from "./development/Go";
import { RustInstaller } from "./development/Rust";
import { RubyInstaller } from "./development/Ruby";

import { SiApple, SiWindows, SiLinux, SiAndroid, SiMicrostrategy, SiGnometerminal, SiHuawei, SiDocker, SiVirtualbox, SiVmware, SiPython, SiNodedotjs, SiGo, SiRust, SiRuby } from "react-icons/si";

export interface Tab {
  id: string;
  title: string;
  content: ReactNode;
  icon?: ReactNode;
  category: string;
}

interface TabPanelProps {
  tag: string;
  current: string;
  children: ReactNode;
}

const TabPanel: React.FC<TabPanelProps> = ({ tag, current, children }) => {
  return (
    <div
      className='absolute w-full h-full overflow-auto'
      hidden={current !== tag}>
      {children}
    </div>
  );
};

const ComingSoon: React.FC<{ name: string; icon: React.ReactNode }> = ({ name, icon }) => (
  <div className="h-full flex items-center justify-center text-zinc-600 bg-[#050505]">
    <div className="flex flex-col items-center gap-6">
      <div className="text-zinc-800">{icon}</div>
      <div className="text-sm font-bold uppercase tracking-widest text-zinc-700">{name} Integration</div>
      <div className="text-[10px] text-zinc-600 text-center max-w-xs leading-relaxed">
        We're working on native {name} support. Join the waitlist to get notified when it's ready.
      </div>
      <button
        className="px-6 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-600/30 hover:text-blue-300 transition-all active:scale-95"
        onClick={() => {
          window.open("https://networkspy.io/waitlist", "_blank");
        }}
      >
        Join Waitlist
      </button>
    </div>
  </div>
);

export const UnifiedCertificateInstaller: React.FC = () => {
  const tabs: Tab[] = [
    // Desktop
    { id: "mac", title: "MacOS", category: "Desktop", content: <MacOSInstaller />, icon: <SiApple size={16} /> },
    { id: "windows", title: "Windows", category: "Desktop", content: <WindowsInstaller />, icon: <SiWindows size={16} /> },
    { id: "linux", title: "Linux", category: "Desktop", content: <LinuxInstaller />, icon: <SiLinux size={16} /> },

    // Mobile
    { id: "android-device", title: "Android Device", category: "Mobile", content: <AndroidDeviceInstaller />, icon: <SiAndroid size={16} /> },
    { id: "android-emulator", title: "Android Emulator", category: "Mobile", content: <AndroidEmulatorInstaller />, icon: <SiAndroid size={16} /> },
    { id: "ios-device", title: "iOS Device", category: "Mobile", content: <IOSDeviceInstaller />, icon: <SiApple size={16} /> },
    { id: "ios-simulator", title: "iOS Simulator", category: "Mobile", content: <IOSSimulatorInstaller />, icon: <SiApple size={16} /> },
    { id: "qnx", title: "QNX Device", category: "Mobile", content: <ComingSoon name="QNX" icon={<SiMicrostrategy size={48} />} />, icon: <SiMicrostrategy size={16} /> },
    { id: "kaios", title: "KaiOS Device", category: "Mobile", content: <ComingSoon name="KaiOS" icon={<SiGnometerminal size={48} />} />, icon: <SiGnometerminal size={16} /> },
    { id: "harmony", title: "HarmonyOS Device", category: "Mobile", content: <ComingSoon name="HarmonyOS" icon={<SiHuawei size={48} />} />, icon: <SiHuawei size={16} /> },

    // Virtual Machines
    { id: "docker", title: "Docker", category: "Virtual Machines", content: <DockerInstaller />, icon: <SiDocker size={16} /> },
    { id: "virtualbox", title: "VirtualBox", category: "Virtual Machines", content: <VirtualBoxInstaller />, icon: <SiVirtualbox size={16} /> },
    { id: "vmware", title: "VMware", category: "Virtual Machines", content: <VMWareInstaller />, icon: <SiVmware size={16} /> },
    { id: "kvm", title: "KVM", category: "Virtual Machines", content: <KVMInstaller />, icon: <FiMonitor size={16} /> },

    // Development
    { id: "python", title: "Python", category: "Development", content: <PythonInstaller />, icon: <SiPython size={16} /> },
    { id: "nodejs", title: "Node.js", category: "Development", content: <NodeInstaller />, icon: <SiNodedotjs size={16} /> },
    { id: "go", title: "Go (Golang)", category: "Development", content: <GoInstaller />, icon: <SiGo size={16} /> },
    { id: "rust", title: "Rust", category: "Development", content: <RustInstaller />, icon: <SiRust size={16} /> },
    { id: "ruby", title: "Ruby", category: "Development", content: <RubyInstaller />, icon: <SiRuby size={16} /> },
  ];

  const [currentTab, setCurrentTab] = useState(tabs[0].id);
  const [searchTerm, setSearchTerm] = useState("");
  const [detectedOS, setDetectedOS] = useState<string | null>(null);

  useEffect(() => {
    const detectOS = async () => {
      const osType = await type();
      let targetId = "mac";
      if (osType === "windows") targetId = "windows";
      if (osType === "linux") targetId = "linux";
      
      setDetectedOS(targetId);
      setCurrentTab(targetId);
    };
    detectOS();
  }, []);

  const filteredTabs = useMemo(() => {
    return tabs.filter(tab =>
      tab.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tab.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tabs, searchTerm]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(filteredTabs.map(t => t.category)));
    return cats;
  }, [filteredTabs]);

  return (
    <div className='flex h-full bg-[#0a0a0a] text-white w-full relative overflow-hidden'>
      {/* Sidebar */}
      <div className='w-64 flex flex-col border-r border-zinc-800 bg-[#111111] z-10 p-4 shrink-0 shadow-2xl'>
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800 focus-within:border-blue-500 transition-all mb-6 group">
          <FiSearch className="text-zinc-500 group-focus-within:text-blue-500" size={14} />
          <input
            type='text'
            className='bg-transparent border-none outline-none text-[11px] text-zinc-300 w-full placeholder:text-zinc-600'
            placeholder='Search installer...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto no-scrollbar pb-10">
          {categories.map((category) => (
            <div key={category} className="flex flex-col gap-1">
              <div className="px-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{category}</span>
              </div>
              {filteredTabs.filter(t => t.category === category).map((tab) => {
                const isActive = currentTab === tab.id;
                const isCurrentOS = detectedOS === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    className={twMerge(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 text-left relative",
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    )}
                    onClick={() => setCurrentTab(tab.id)}
                  >
                    {tab.icon && <span className={twMerge("transition-colors", isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300")}>{tab.icon}</span>}
                    <span className="truncate">{tab.title}</span>
                    
                    {isCurrentOS && (
                      <div className="absolute right-3 flex items-center group">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse" />
                        <div className="absolute w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping opacity-75" />
                      </div>
                    )}

                    {isActive && (
                      <div className="absolute left-0 w-1 h-4 bg-white rounded-r-full shadow-[0_0_8px_white]" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredTabs.length === 0 && (
            <div className="px-2 py-8 text-center">
              <div className="text-zinc-700 font-bold mb-1 italic text-xs">No Results</div>
              <div className="text-[10px] text-zinc-600">Try checking your spelling</div>
            </div>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-zinc-800/50">
          <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/50">
            <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Need more help?</div>
            <div className="text-[10px] text-zinc-400 leading-relaxed italic">
              Contact our engineering team for specialized enterprise deployments.
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className='relative flex-grow h-full bg-[#050505]'>
        {tabs.map((tab) => (
          <TabPanel key={tab.id} current={currentTab} tag={tab.id}>
            {tab.content}
          </TabPanel>
        ))}
      </div>
    </div>
  );
};

export default UnifiedCertificateInstaller;
