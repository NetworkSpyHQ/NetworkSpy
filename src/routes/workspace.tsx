import { FiLayout, FiClock, FiStar, FiUsers, FiLock, FiZap, FiCheckCircle } from 'react-icons/fi';
import { useLicense } from '../hooks/useLicense';

export default function WorkspacePage() {
    const { isTeam } = useLicense();

    if (!isTeam) {
        return (
            <div className="flex flex-col h-full bg-[#050505] items-center justify-center p-12 overflow-y-auto">
                <div className="max-w-xl w-full">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-purple-600/10 border border-purple-500/20 rounded-[2rem] flex items-center justify-center text-purple-500 mx-auto mb-8 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
                            <FiUsers size={40} />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-4 uppercase">Team Workspaces</h1>
                        <p className="text-zinc-500 leading-relaxed">
                            Collaborate in real-time with your team. Organize projects, share traffic captures, and sync custom scripts across your entire organization.
                        </p>
                    </div>

                    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-[2.5rem] p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700 pointer-events-none">
                            <FiLayout size={200} />
                        </div>

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest mb-8">
                                <FiLock size={10} className="mr-1" />
                                Team Feature
                            </div>

                            <h2 className="text-2xl font-black text-white mb-8">Built for Modern Engineering Teams</h2>

                            <div className="space-y-6 mb-12">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-500 shrink-0">
                                        <FiUsers size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">Collaborative Debugging</h4>
                                        <p className="text-xs text-zinc-500 leading-relaxed">Share live traffic sessions with a single link and debug together in real-time.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-500 shrink-0">
                                        <FiZap size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">Unified Script Registry</h4>
                                        <p className="text-xs text-zinc-500 leading-relaxed">Maintain a shared library of custom viewers and interceptors for your team.</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => window.open('https://networkspy.pro/pricing', '_blank')}
                                className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all duration-300 shadow-xl hover:shadow-purple-500/30 flex items-center justify-center gap-3"
                            >
                                Contact Sales for Team Plan
                            </button>
                        </div>
                    </div>

                    <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mt-10">
                        Available on the NetworkSpy Team & Enterprise Plans
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-[#0a0a0a]">
            <div className="max-w-md w-full bg-[#161616] border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                    <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                        Incoming
                    </span>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-6">
                    <FiLayout size={32} className="text-blue-500" />
                </div>

                <h1 className="text-2xl font-black text-white mb-4 tracking-tight">Workspaces</h1>

                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                    Organize your network research into isolated workspaces. Every workspace keeps its own traffic history, scripts, and environment variables.
                </p>

                <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3 text-xs text-zinc-500">
                        <FiCheckCircle size={14} className="text-green-500" />
                        <span>Isolated Traffic Storage</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-zinc-500">
                        <FiCheckCircle size={14} className="text-green-500" />
                        <span>Shared Team Context (Pro)</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-zinc-500">
                        <FiCheckCircle size={14} className="text-green-500" />
                        <span>Project-specific Breakpoints</span>
                    </li>
                </ul>

                <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5 italic">
                    <FiClock size={14} className="text-zinc-500" />
                    <span className="text-[11px] text-zinc-500">Scheduled for Q3 2026 update</span>
                </div>
            </div>
        </div>
    );
}
