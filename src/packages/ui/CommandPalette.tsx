import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useAtom } from 'jotai';
import { commandPaletteOpenAtom } from '@src/utils/trafficAtoms';
import { useAppProvider } from '../app-env';
import { FiSearch, FiCommand, FiTarget, FiMapPin, FiRefreshCw, FiGrid, FiCode, FiTag, FiGitBranch, FiTerminal, FiSliders, FiSave, FiSettings, FiChrome } from 'react-icons/fi';

interface BrowserInfo {
  name: string;
  path: string;
  running: boolean;
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(commandPaletteOpenAtom);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [browsers, setBrowsers] = useState<BrowserInfo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { openNewWindow } = useAppProvider();

  const launchBrowser = useCallback((name: string, path: string) => {
    invoke('launch_browser', { name, path }).catch((e) => console.error('Failed to launch:', e));
  }, []);

  const relaunchBrowser = useCallback((name: string, path: string) => {
    invoke('relaunch_browser', { name, path }).catch((e) => console.error('Failed to relaunch:', e));
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, [setIsOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'p' || e.key === 'k')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    invoke<BrowserInfo[]>('get_installed_browsers').then(setBrowsers).catch(() => setBrowsers([]));
    setTimeout(() => inputRef.current?.focus(), 50);

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        close();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('mousedown', handleGlobalMouseDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('mousedown', handleGlobalMouseDown);
    };
  }, [isOpen, close]);

  const commands: CommandItem[] = [
    ...browsers.filter(b => b.running).map((b, i) => ({
      id: `relaunch-${i}`,
      label: `Relaunch ${b.name}`,
      description: `Close and relaunch ${b.name}`,
      icon: <FiRefreshCw size={16} />,
      keywords: ['browser', 'relaunch', 'restart', 'launch', b.name.toLowerCase()],
      action: () => {
        close();
        relaunchBrowser(b.name, b.path);
      },
    })),
    ...browsers.map((b, i) => ({
      id: `launch-${i}`,
      label: `Launch ${b.name}`,
      description: `Open a new ${b.name} instance`,
      icon: <FiChrome size={16} />,
      keywords: [b.name.toLowerCase(), 'browser', 'launch', 'open'],
      action: () => {
        close();
        launchBrowser(b.name, b.path);
      },
    })),
    {
      id: 'breakpoint',
      label: 'Open Breakpoint',
      description: 'Manage traffic breakpoints',
      icon: <FiTarget size={16} />,
      keywords: ['breakpoint', 'break', 'pause', 'intercept'],
      action: () => { close(); openNewWindow('breakpoint', 'Traffic Breakpoints'); },
    },
    {
      id: 'map-local',
      label: 'Open Map Local',
      description: 'Map remote files to local files',
      icon: <FiMapPin size={16} />,
      keywords: ['map', 'local', 'file', 'redirect'],
      action: () => { close(); openNewWindow('map-local', 'Map Local Rules'); },
    },
    {
      id: 'map-remote',
      label: 'Open Map Remote',
      description: 'Map remote URLs to other remote URLs',
      icon: <FiGitBranch size={16} />,
      keywords: ['map', 'remote', 'redirect', 'url'],
      action: () => { close(); openNewWindow('map-remote', 'Map Remote Rules'); },
    },
    {
      id: 'rewrite',
      label: 'Open Rewrite',
      description: 'Modify request/response data on the fly',
      icon: <FiCode size={16} />,
      keywords: ['rewrite', 'modify', 'request', 'response', 'header', 'body'],
      action: () => { close(); openNewWindow('rewrite', 'Rewrite Rules'); },
    },
    {
      id: 'scripting',
      label: 'Open Scripting',
      description: 'Run custom scripts on traffic',
      icon: <FiTerminal size={16} />,
      keywords: ['script', 'code', 'js', 'javascript', 'automation'],
      action: () => { close(); openNewWindow('scripting', 'Custom Scripting'); },
    },
    {
      id: 'tag',
      label: 'Open Tags',
      description: 'Manage traffic tags',
      icon: <FiTag size={16} />,
      keywords: ['tag', 'label', 'categorize', 'organize'],
      action: () => { close(); openNewWindow('tag', 'Tag Tools'); },
    },
    {
      id: 'diffing',
      label: 'Open Diffing',
      description: 'Compare traffic sessions',
      icon: <FiGitBranch size={16} />,
      keywords: ['diff', 'compare', 'session', 'traffic'],
      action: () => { close(); openNewWindow('diffing', 'Traffic Diffing'); },
    },
    {
      id: 'logging',
      label: 'Open Logging',
      description: 'View and configure logging',
      icon: <FiTerminal size={16} />,
      keywords: ['log', 'logging', 'console', 'debug'],
      action: () => { close(); openNewWindow('logging', 'Traffic Logging'); },
    },
    {
      id: 'proxy-list',
      label: 'Open Proxy List',
      description: 'Configure proxy intercept rules',
      icon: <FiSliders size={16} />,
      keywords: ['proxy', 'rule', 'intercept', 'list'],
      action: () => { close(); openNewWindow('proxylist', 'Proxy Intercept Rules'); },
    },
    {
      id: 'filters',
      label: 'Open Filters',
      description: 'Manage traffic filter presets',
      icon: <FiGrid size={16} />,
      keywords: ['filter', 'preset', 'traffic', 'search'],
      action: () => { close(); openNewWindow('filters', 'Traffic Filters'); },
    },
    {
      id: 'sessions',
      label: 'Open Sessions',
      description: 'View and manage saved sessions',
      icon: <FiSave size={16} />,
      keywords: ['session', 'save', 'load', 'history'],
      action: () => { close(); openNewWindow('sessions', 'Saved Sessions'); },
    },
    {
      id: 'composer',
      label: 'Open Composer',
      description: 'Craft and send custom HTTP requests',
      icon: <FiCode size={16} />,
      keywords: ['composer', 'request', 'http', 'api', 'craft', 'send', 'postman'],
      action: () => { close(); openNewWindow('composer', 'Composer'); },
    },
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Configure application settings',
      icon: <FiSettings size={16} />,
      keywords: ['settings', 'preferences', 'config', 'options'],
      action: () => { close(); navigate('/settings'); },
    },
  ];

  const filtered = query.trim()
    ? commands.filter(c => {
        const q = query.toLowerCase();
        return c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.keywords.some(k => k.includes(q));
      })
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={dialogRef}
        className="w-full max-w-lg bg-[#1a1a1a] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <FiSearch size={16} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-900 rounded border border-zinc-800">
            <FiCommand size={10} />P
          </kbd>
        </div>

        <div className="max-h-[350px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-zinc-500 text-sm">
              No commands found for "<span className="text-zinc-400">{query}</span>"
            </div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => cmd.action()}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                i === selectedIndex
                  ? 'bg-blue-600/15 text-blue-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <span className={`shrink-0 ${i === selectedIndex ? 'text-blue-400' : 'text-zinc-500'}`}>
                {cmd.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${i === selectedIndex ? 'text-blue-300' : 'text-zinc-100'}`}>
                  {cmd.label}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">{cmd.description}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-zinc-800 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-zinc-900 rounded border border-zinc-800 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-zinc-900 rounded border border-zinc-800 font-mono">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-zinc-900 rounded border border-zinc-800 font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};
