import React, { useState } from 'react';
import { FiGrid, FiSearch, FiDownload, FiInfo, FiCreditCard, FiShoppingCart, FiCpu, FiPlay, FiX, FiCheck, FiChevronRight, FiTrendingUp, FiLock, FiTerminal, FiEye, FiZap } from 'react-icons/fi';
import { Dialog } from '../packages/ui/Dialog';
import { createPortal } from 'react-dom';
import { useLicense } from '../hooks/useLicense';

interface Extension {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    category: string;
    installs: string;
    previewImage: string;
    features: string[];
    author: string;
    trending?: boolean;
}

export default function ExtensionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);
  const [isIncomingDialogOpen, setIsIncomingDialogOpen] = useState(false);
  const { isPro } = useLicense();

  if (!isPro) {
    return (
        <div className="flex flex-col h-full bg-[#050505] items-center justify-center p-12 overflow-y-auto">
            <div className="max-w-xl w-full">
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-blue-600/10 border border-blue-500/20 rounded-[2rem] flex items-center justify-center text-blue-500 mx-auto mb-8 shadow-[0_0_50px_rgba(37,99,235,0.1)]">
                        <FiGrid size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-4 uppercase">Extension Marketplace</h1>
                    <p className="text-zinc-500 leading-relaxed">
                        Supercharge your debugging workflow with specialized protocol analyzers, security scanners, and custom data visualizers.
                    </p>
                </div>

                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-[2.5rem] p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700 pointer-events-none">
                        <FiZap size={200} />
                    </div>

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">
                            <FiLock size={10} className="mr-1" />
                            Pro Feature
                        </div>

                        <h2 className="text-2xl font-black text-white mb-8">Unlock the Full Ecosystem</h2>

                        <div className="space-y-6 mb-12">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-500 shrink-0">
                                    <FiZap size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1">Advanced Protocol Support</h4>
                                    <p className="text-xs text-zinc-500 leading-relaxed">Deep inspection for gRPC, MQTT, GraphQL, and proprietary enterprise protocols.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-500 shrink-0">
                                    <FiLock size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1">Security Analyzers</h4>
                                    <p className="text-xs text-zinc-500 leading-relaxed">Automated PCI compliance checking, sensitive data masking, and auth-flow validation.</p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => window.open('https://networkspy.pro/pricing', '_blank')}
                            className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-xl hover:shadow-blue-500/30 flex items-center justify-center gap-3"
                        >
                            Upgrade to Pro
                        </button>
                    </div>
                </div>

                <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mt-10">
                    Available on the NetworkSpy Professional Plan
                </p>
            </div>
        </div>
    );
  }

  const extensions: Extension[] = [
    {
      id: 'oauth-analyzer',
      title: 'OAuth 2.0 / OIDC Inspector',
      desc: 'Trace and validate complex authentication flows. Automates state verification and JWT decoding for enterprise SSO.',
      icon: <FiLock size={24} />,
      category: 'Security',
      installs: '12.4k',
      previewImage: 'file:///Users/muiz/.gemini/antigravity/brain/47115efa-8dd2-44ce-93f3-be1777cbf747/oauth_analyzer_ui_1773456698295.png',
      author: 'IdentityGuard',
      trending: true,
      features: [
        'Real-time redirect chain visualization',
        'Automatic State & Nonce validation',
        'OIDC discovery document parsing',
        'Encrypted JWT (JWE) support'
      ]
    },
    {
        id: 'grpc-proto-debug',
        title: 'gRPC Protobuf Visualizer',
        desc: 'Native decoding for gRPC-web and raw HTTP/2 gRPC traffic. Browse Protobuf definitions and inspect nested payloads.',
        icon: <FiTerminal size={24} />,
        category: 'Protocols',
        installs: '8.2k',
        previewImage: 'file:///Users/muiz/.gemini/antigravity/brain/47115efa-8dd2-44ce-93f3-be1777cbf747/grpc_visualizer_ui_1773456716186.png',
        author: 'MicroService Tools',
        trending: true,
        features: [
          'Protobuf Schema reflection support',
          'Status-code to GRPC-error mapping',
          'Bi-directional stream monitoring',
          'Binary to JSON pretty-printing'
        ]
      },
    {
      id: 'payment-pro',
      title: 'Payment Inspector',
      desc: 'Deep decoding for Stripe, PayPal, and Adyen payloads. Detects PCI compliance issues and visualizes secure handshakes.',
      icon: <FiCreditCard size={24} />,
      category: 'Finance',
      installs: '1.2k',
      previewImage: 'file:///Users/muiz/.gemini/antigravity/brain/47115efa-8dd2-44ce-93f3-be1777cbf747/payment_inspector_ui_1773456275639.png',
      author: 'NetSpy Core Team',
      features: [
        'Automatic Stripe signature validation',
        'PCI-DSS sensitivity masking',
        'Visual transaction flow mapping',
        'Fraud score analysis per request'
      ]
    },
    {
      id: 'ecommerce-tracker',
      title: 'E-commerce Debugger',
      desc: 'Visualize cart events, pixel tracking, and inventory sync for Shopify and Magento. Perfect for verifying marketing tags.',
      icon: <FiShoppingCart size={24} />,
      category: 'Business',
      installs: '850',
      previewImage: 'file:///Users/muiz/.gemini/antigravity/brain/47115efa-8dd2-44ce-93f3-be1777cbf747/ecommerce_debugger_ui_1773456308730.png',
      author: 'ShopAudit Labs',
      features: [
        'Shopify Liquid variable tracking',
        'Google Analytics 4 event validation',
        'Meta Pixel hit visualization',
        'Inventory delta reporting'
      ]
    },
    {
      id: 'ai-stream-viz',
      title: 'AI Stream Visualizer',
      desc: 'Real-time token distribution and probability mapping for LLM streaming responses. Inspect OpenAI and Anthropic streams.',
      icon: <FiCpu size={24} />,
      category: 'Artificial Intelligence',
      installs: '3.4k',
      previewImage: 'file:///Users/muiz/.gemini/antigravity/brain/47115efa-8dd2-44ce-93f3-be1777cbf747/ai_stream_visualizer_ui_1773456291531.png',
      author: 'NeuralOps',
      features: [
        'Live token-by-token rendering',
        'Logprobs probability heatmap',
        'Latency per chunk monitoring',
        'Instruction vs Completion coloring'
      ]
    },
    {
      id: 'media-master',
      title: 'HLS/Dash Analyzer',
      desc: 'Chunk visualization and manifest troubleshooting for video streaming traffic. Debug buffer stalls and quality drops.',
      icon: <FiPlay size={24} />,
      category: 'Media',
      installs: '2.1k',
      previewImage: 'file:///Users/muiz/.gemini/antigravity/brain/47115efa-8dd2-44ce-93f3-be1777cbf747/media_master_ui_1773456339185.png',
      author: 'StreamSync',
      features: [
        'M3U8/MPD manifest live diffing',
        'Segment load waterfall chart',
        'Bitrate ladder Quality-of-Experience (QoE)',
        'Codec metadata extraction'
      ]
    }
  ];

  const filteredExtensions = extensions.filter(ext => 
    ext.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ext.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const trendingExtensions = extensions.filter(e => e.trending);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
      {/* Header Section */}
      <div className="p-8 pb-4 border-b border-white/5 bg-gradient-to-b from-blue-600/5 to-transparent shrink-0">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Extensions</h1>
                <p className="text-zinc-500 text-sm">Enhance your workflow with community-built protocol viewers and analyzers.</p>
            </div>
            <div className="px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest italic">Marketplace</span>
            </div>
        </div>

        <div className="relative max-w-xl group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
                type="text"
                placeholder="Search extensions by name or category..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Top Trending Section */}
        {!searchTerm && (
            <div className="p-8 pb-4">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <FiTrendingUp className="text-orange-500" size={16} />
                    </div>
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Top Trending Enterprise</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {trendingExtensions.map(ext => (
                        <div 
                            key={ext.id}
                            onClick={() => setSelectedExtension(ext)}
                            className="bg-gradient-to-br from-zinc-900 to-[#121212] border border-blue-500/20 rounded-[24px] p-6 hover:border-blue-500/40 transition-all cursor-pointer group relative overflow-hidden flex items-center gap-6 active:scale-[0.98]"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
                            
                            <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-105 transition-transform duration-500 shadow-2xl">
                                {ext.icon}
                            </div>

                            <div className="flex-1">
                                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest block mb-1">{ext.category}</span>
                                <h3 className="text-xl font-black text-white mb-2 tracking-tight line-clamp-1">{ext.title}</h3>
                                <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 max-w-sm">{ext.desc}</p>
                            </div>

                            <div className="shrink-0 flex flex-col items-center gap-2">
                                <div className="p-2.5 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-900/40 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                    <FiChevronRight size={18} />
                                </div>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{ext.installs}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Regular List */}
        <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <FiGrid className="text-blue-500" size={16} />
                </div>
                <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                    {searchTerm ? `Search Results for "${searchTerm}"` : 'All Extensions'}
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExtensions.filter(e => !e.trending || searchTerm).map(ext => (
                    <div 
                        key={ext.id} 
                        onClick={() => setSelectedExtension(ext)}
                        className="bg-[#161616] border border-zinc-800 rounded-2xl p-6 hover:border-zinc-600 transition-all flex flex-col group relative overflow-hidden cursor-pointer active:scale-95 duration-200"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex items-start justify-between mb-6">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                                {ext.icon}
                            </div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{ext.category}</span>
                        </div>

                        <h3 className="text-[15px] font-bold text-white mb-2">{ext.title}</h3>
                        <p className="text-zinc-400 text-xs leading-relaxed mb-8 flex-1 line-clamp-2">{ext.desc}</p>

                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <FiDownload size={14} className="text-zinc-600" />
                                <span className="text-[11px] font-mono text-zinc-500">{ext.installs}</span>
                            </div>
                            <div className="flex items-center text-blue-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                View <FiChevronRight size={14} className="ml-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredExtensions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <FiInfo size={48} className="text-zinc-800 mb-4" />
                    <h3 className="text-zinc-500 font-bold">No results found for "{searchTerm}"</h3>
                    <p className="text-zinc-600 text-sm">Try searching for finance, business, or streaming.</p>
                </div>
            )}
        </div>
      </div>

      {/* Extension Detail Overlay */}
      {selectedExtension && (
          <ExtensionDetailModal 
            extension={selectedExtension} 
            onClose={() => setSelectedExtension(null)} 
            onInstall={() => setIsIncomingDialogOpen(true)}
          />
      )}

      <Dialog 
        isOpen={isIncomingDialogOpen}
        onClose={() => setIsIncomingDialogOpen(false)}
        title="Incoming Feature"
        message="The Extension Marketplace is currently in closed beta. Plugin installation will be available in the upcoming v1.0.0 release."
        type="info"
      />
    </div>
  );
}

const ExtensionDetailModal = ({ extension, onClose, onInstall }: { extension: Extension, onClose: () => void, onInstall: () => void }) => {
    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 p-4 lg:p-12">
            <div 
                className="w-full max-w-6xl h-full max-h-[90vh] bg-[#111111] border border-zinc-800 rounded-[32px] shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] flex flex-col lg:flex-row overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Left: Preview Image */}
                <div className="w-full lg:w-2/3 bg-black flex items-center justify-center p-8 relative group">
                    <img 
                        src={extension.previewImage} 
                        alt={extension.title} 
                        className="w-full h-full object-contain rounded-2xl shadow-2xl transition-transform duration-700 group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-10 left-10 flex items-center gap-3">
                        <div className="px-4 py-1.5 bg-blue-600/20 backdrop-blur-md border border-blue-500/30 rounded-full text-[10px] text-blue-400 font-black tracking-widest uppercase">
                            Feature Live Preview
                        </div>
                    </div>
                </div>

                {/* Right: Info */}
                <div className="w-full lg:w-1/3 flex flex-col border-l border-zinc-800 bg-[#161616]">
                    <div className="p-8 pb-4 flex justify-between items-start">
                        <div className="w-16 h-16 rounded-3xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-blue-500 shadow-2xl">
                            {extension.icon}
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-all active:scale-90"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    <div className="p-8 pt-4 flex-1 overflow-y-auto custom-scrollbar">
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2 leading-none">{extension.title}</h2>
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{extension.category}</span>
                            <span className="text-zinc-800">•</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{extension.author}</span>
                        </div>

                        <p className="text-zinc-400 text-sm leading-relaxed mb-10">{extension.desc}</p>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.3em]">Key Capabilities</h4>
                                <div className="space-y-4">
                                    {extension.features.map((f, i) => (
                                        <div key={i} className="flex items-start gap-4">
                                            <div className="w-5 h-5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
                                                <FiCheck size={12} strokeWidth={3} />
                                            </div>
                                            <span className="text-xs text-zinc-300 leading-tight font-medium">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-5 bg-gradient-to-tr from-zinc-900 to-transparent rounded-2xl border border-zinc-800/50">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Community Pulse</span>
                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[9px] font-bold rounded">Rising</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-2">
                                        {[1,2,3].map(i => (
                                            <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#161616] bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shadow-md`}>
                                                {String.fromCharCode(64 + i)}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[11px] text-zinc-400 font-medium">Trusted by teams at top tech cos.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-zinc-800 bg-[#0f0f0f]">
                        <button 
                            onClick={onInstall}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.97] flex items-center justify-center gap-3"
                        >
                            <FiDownload size={16} />
                            Provision Extension
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
