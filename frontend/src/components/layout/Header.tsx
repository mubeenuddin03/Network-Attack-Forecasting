import { ReactNode, useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Activity, Cpu, Clock, Command, Volume2, VolumeX, Sun, Moon, Eye, EyeOff, Download, Upload, Terminal, Settings } from 'lucide-react';
import { cn, formatTimestamp, formatRelativeTime } from '@/utils/helpers';
import { Tooltip } from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { useApiStatus, useHealth, useModelMode, useDashboardStore } from '@/contexts/DashboardContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/contexts/SoundContext';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
}

export function Header({ title = 'Network Attack Forecasting', subtitle = 'Predicting the next attack window before compromise' }: HeaderProps) {
  const apiStatus = useApiStatus();
  const health = useHealth();
  const modelMode = useModelMode();
  const { theme, highContrast, toggleTheme, setHighContrast } = useTheme();
  const { enabled: soundEnabled, toggleSound, play } = useSound();
  const { reducedMotion, setReducedMotion } = useReducedMotion();
  const { sidebarCollapsed } = useDashboardStore();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [, setNow] = useState(new Date());
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      play('click');
      setShowCommandPalette(true);
    }
    if (e.key === 'Escape') {
      setShowCommandPalette(false);
      setShowSettings(false);
      setShowDiagnostics(false);
    }
  }, [play]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const statusConfig = {
    connected: { icon: Wifi, label: 'CONNECTED', variant: 'connected' as const },
    degraded: { icon: Wifi, label: 'DEGRADED', variant: 'degraded' as const },
    offline: { icon: WifiOff, label: 'OFFLINE', variant: 'offline' as const },
    checking: { icon: Wifi, label: 'CHECKING...', variant: 'default' as const },
  };

  const status = statusConfig[apiStatus];
  const modelModeConfig = modelMode === 'REAL_MODEL' 
    ? { label: 'REAL MODEL', variant: 'real-model' as const, icon: Cpu }
    : { label: 'DEMO MODE', variant: 'demo' as const, icon: Cpu };

  const commandPaletteItems = [
    { id: 'refresh', label: 'Refresh Prediction', description: 'Force a new prediction from the backend', shortcut: 'R', action: () => { useDashboardStore.getState().setLoading(true); play('refresh'); setTimeout(() => useDashboardStore.getState().setLoading(false), 1000); } },
    { id: 'toggle-sidebar', label: 'Toggle Sidebar', description: 'Show or hide the navigation sidebar', shortcut: 'B', action: () => { useDashboardStore.getState().toggleSidebar(); play('click'); } },
    { id: 'api-health', label: 'Open API Health', description: 'View detailed API connection status', shortcut: 'H', action: () => { setShowDiagnostics(true); play('click'); } },
    { id: 'prediction-inspector', label: 'Open Prediction Inspector', description: 'View detailed prediction payload', shortcut: 'I', action: () => { play('click'); } },
    { id: 'toggle-theme', label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode', description: 'Toggle between light and dark themes', shortcut: 'T', action: () => { toggleTheme(); play('click'); } },
    { id: 'toggle-contrast', label: highContrast ? 'Disable High Contrast' : 'Enable High Contrast', description: 'Toggle high contrast mode for accessibility', shortcut: 'C', action: () => { setHighContrast(!highContrast); play('click'); } },
    { id: 'toggle-sound', label: soundEnabled ? 'Disable Sounds' : 'Enable Sounds', description: 'Toggle UI sound effects', shortcut: 'S', action: () => { toggleSound(); play('click'); } },
    { id: 'toggle-reduced-motion', label: reducedMotion ? 'Enable Animations' : 'Disable Animations', description: 'Toggle reduced motion mode', shortcut: 'M', action: () => { setReducedMotion(!reducedMotion); play('click'); } },
  ];

  return (
    <header
      ref={headerRef}
      className={cn(
        'fixed top-0 left-0 right-0 z-[200] h-16',
        'glass-panel-strong border-b border-border-subtle',
        'flex items-center justify-between px-4 md:px-6',
        sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
      )}
      role="banner"
    >
      <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 400, ease: 'easeOut' }}
          className="hidden md:flex flex-col"
        >
          <h1 className="text-heading-md text-text-primary font-semibold tracking-tight">{title}</h1>
          <p className="text-caption text-text-muted">{subtitle}</p>
        </motion.div>
      </div>

      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
        <Tooltip content={`API: ${status.label}`} position="bottom">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-border-subtle">
            <status.icon className={cn('w-4 h-4', status.variant === 'connected' ? 'text-secure-400' : status.variant === 'degraded' ? 'text-amber-400 animate-pulse' : 'text-critical-400')} />
            <Badge variant={status.variant} size="sm">{status.label}</Badge>
          </div>
        </Tooltip>

        <Tooltip content={`Model: ${modelModeConfig.label}`} position="bottom">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-border-subtle">
            <modelModeConfig.icon className="w-4 h-4 text-text-muted" />
            <Badge variant={modelModeConfig.variant} size="sm">{modelModeConfig.label}</Badge>
          </div>
        </Tooltip>

        <Tooltip content={`Forecast Horizon: 5 minutes`} position="bottom">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-border-subtle">
            <Clock className="w-4 h-4 text-text-muted" />
            <span className="text-caption font-medium text-text-secondary">5 min horizon</span>
          </div>
        </Tooltip>

        <Tooltip content={`Last update: ${health ? formatRelativeTime(health.checked_at) : 'Never'}`} position="bottom">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-border-subtle">
            <span className="text-caption text-text-muted">{health ? formatTimestamp(health.checked_at) : '--:--:--'}</span>
          </div>
        </Tooltip>

        <Tooltip content="Open Command Palette (⌘K)" position="bottom">
          <Button variant="ghost" size="sm" onClick={() => { play('click'); setShowCommandPalette(true); }} aria-label="Open command palette">
            <Command className="w-4 h-4" />
            <span className="hidden sm:inline">Command</span>
            <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.625rem] bg-surface-700 rounded text-text-muted font-mono">
              <span>⌘</span>K
            </kbd>
          </Button>
        </Tooltip>

        <Tooltip content={soundEnabled ? 'Disable sounds' : 'Enable sounds'} position="bottom">
          <Button variant="ghost" size="icon" onClick={() => { toggleSound(); play('click'); }} aria-label={soundEnabled ? 'Disable sounds' : 'Enable sounds'}>
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        </Tooltip>

        <Tooltip content={reducedMotion ? 'Enable animations' : 'Disable animations'} position="bottom">
          <Button variant="ghost" size="icon" onClick={() => { setReducedMotion(!reducedMotion); play('click'); }} aria-label={reducedMotion ? 'Enable animations' : 'Disable animations'}>
            {reducedMotion ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
        </Tooltip>

        <Tooltip content={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} position="bottom">
          <Button variant="ghost" size="icon" onClick={() => { toggleTheme(); play('click'); }} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </Tooltip>

        <Tooltip content="Open Settings" position="bottom">
          <Button variant="ghost" size="icon" onClick={() => { play('click'); setShowSettings(true); }} aria-label="Open settings">
            <Settings className="w-5 h-5" />
          </Button>
        </Tooltip>

        <Tooltip content="Open Diagnostics (⌘H)" position="bottom">
          <Button variant="ghost" size="icon" onClick={() => { play('click'); setShowDiagnostics(true); }} aria-label="Open diagnostics">
            <Terminal className="w-5 h-5" />
          </Button>
        </Tooltip>
      </div>

      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} items={commandPaletteItems} />

      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <DiagnosticsDrawer isOpen={showDiagnostics} onClose={() => setShowDiagnostics(false)} />
    </header>
  );
}

interface CommandPaletteItem {
  id: string;
  label: string;
  description: string;
  shortcut: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandPaletteItem[];
}

function CommandPalette({ isOpen, onClose, items }: CommandPaletteProps) {
  const { play } = useSound();
  const { reducedMotion } = useReducedMotion();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase()) ||
    item.shortcut.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      play('click');
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        play('click');
        filteredItems[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 150 }}
        className="fixed inset-0 z-[900] flex items-start justify-center pt-20"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: reducedMotion ? 0 : 200, ease: [0.34, 1.56, 0.64, 1] }}
          className="glass-panel-strong rounded-2xl shadow-glow-lg w-full max-w-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <Command className="w-5 h-5 text-text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command..."
                className="flex-1 bg-transparent border-none outline-none text-text-primary text-body placeholder-text-muted font-mono"
                aria-label="Command search"
              />
              <kbd className="px-2 py-1 text-[0.625rem] bg-surface-700 rounded text-text-muted font-mono">⎋</kbd>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-text-muted">No commands found</div>
            ) : (
              <ul role="listbox" aria-label="Commands">
                {filteredItems.map((item, index) => (
                  <li
                    key={item.id}
                    ref={el => { itemRefs.current[index] = el; }}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={cn(
                      'px-4 py-3 flex items-center gap-3 transition-colors duration-100',
                      index === selectedIndex
                        ? 'bg-electric-500/10 text-text-primary'
                        : 'text-text-secondary hover:bg-surface-800'
                    )}
                    onClick={() => { play('click'); item.action(); onClose(); }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium truncate">{item.label}</p>
                      <p className="text-caption text-text-muted truncate">{item.description}</p>
                    </div>
                    <kbd className="px-2 py-0.5 text-[0.625rem] bg-surface-700 rounded text-text-muted font-mono flex-shrink-0">
                      {item.shortcut}
                    </kbd>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function SettingsDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { play } = useSound();
  const { reducedMotion, setReducedMotion } = useReducedMotion();
  const { theme, toggleTheme, highContrast, setHighContrast } = useTheme();
  const { enabled: soundEnabled, toggleSound } = useSound();

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      description="Configure dashboard preferences and accessibility options"
      position="right"
      size="md"
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-heading-sm text-text-primary mb-4">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-text-primary">Theme</p>
                <p className="text-caption text-text-muted">Choose color scheme</p>
              </div>
              <Button variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => { toggleTheme(); play('click'); }}>
                {theme === 'dark' ? 'Dark' : 'Light'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-text-primary">High Contrast</p>
                <p className="text-caption text-text-muted">Increase color contrast for accessibility</p>
              </div>
              <Button variant={highContrast ? 'primary' : 'secondary'} onClick={() => { setHighContrast(!highContrast); play('click'); }}>
                {highContrast ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-heading-sm text-text-primary mb-4">Accessibility</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-text-primary">Reduced Motion</p>
                <p className="text-caption text-text-muted">Disable non-essential animations</p>
              </div>
              <Button variant={reducedMotion ? 'primary' : 'secondary'} onClick={() => { setReducedMotion(!reducedMotion); play('click'); }}>
                {reducedMotion ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-text-primary">Sound Effects</p>
                <p className="text-caption text-text-muted">Play subtle UI confirmation sounds</p>
              </div>
              <Button variant={soundEnabled ? 'primary' : 'secondary'} onClick={() => { toggleSound(); play('click'); }}>
                {soundEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-heading-sm text-text-primary mb-4">Data & Sync</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-text-primary">Auto Refresh</p>
                <p className="text-caption text-text-muted">Automatically fetch new predictions</p>
              </div>
              <Button variant="secondary" onClick={() => { play('click'); }}>Configure</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-text-primary">Export Data</p>
                <p className="text-caption text-text-muted">Download prediction history as CSV</p>
              </div>
              <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />} onClick={() => { play('click'); }}>
                Export
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Drawer>
  );
}

function DiagnosticsDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { play } = useSound();
  const diagnostics = useDashboardStore(state => state.diagnostics);
  const health = useHealth();
  const prediction = useDashboardStore(state => state.prediction);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="System Diagnostics"
      description="Technical diagnostics for development and troubleshooting"
      position="right"
      size="lg"
    >
      <div className="space-y-6 font-mono text-body-sm">
        <section>
          <h3 className="text-heading-sm text-text-primary mb-3 flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            API Status
          </h3>
          <div className="grid grid-cols-2 gap-3 text-caption">
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Frontend Version</p>
              <p className="text-text-primary font-medium">{diagnostics?.frontend_version || '1.0.0'}</p>
            </div>
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Backend Version</p>
              <p className="text-text-primary font-medium">{diagnostics?.backend_version || 'Unknown'}</p>
            </div>
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">API Latency</p>
              <p className="text-text-primary font-medium">{diagnostics?.api_latency_ms || 0} ms</p>
            </div>
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Model Mode</p>
              <p className="text-text-primary font-medium">{diagnostics?.model_mode || 'DEMO'}</p>
            </div>
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Uptime</p>
              <p className="text-text-primary font-medium">{diagnostics?.uptime_seconds || 0}s</p>
            </div>
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Last Health Check</p>
              <p className="text-text-primary font-medium">{diagnostics?.last_health_check ? formatRelativeTime(diagnostics.last_health_check) : 'Never'}</p>
            </div>
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Last Prediction</p>
              <p className="text-text-primary font-medium">{diagnostics?.last_prediction_update ? formatRelativeTime(diagnostics.last_prediction_update) : 'Never'}</p>
            </div>
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Endpoint Status</p>
              <p className="text-text-primary font-medium">
                {Object.entries(diagnostics?.endpoint_status || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Unknown'}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-heading-sm text-text-primary mb-3 flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            Model Health
          </h3>
          <div className="grid grid-cols-2 gap-3 text-caption">
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Status</p>
              <p className={cn('font-medium', health?.status === 'healthy' ? 'text-secure-400' : 'text-amber-400')}>
                {health?.status?.toUpperCase() || 'UNKNOWN'}
              </p>
            </div>
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Model Loaded</p>
              <p className="text-text-primary font-medium">{health?.model_loaded ? 'Yes' : 'No'}</p>
            </div>
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Algorithm</p>
              <p className="text-text-primary font-medium">{health?.model_info?.algorithm || 'Logistic Regression'}</p>
            </div>
            <div className="glass-panel p-3 rounded-lg">
              <p className="text-text-muted">Features</p>
              <p className="text-text-primary font-medium">{health?.model_info?.features || 35}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-heading-sm text-text-primary mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Last Prediction
          </h3>
          <div className="glass-panel p-4 rounded-lg space-y-2 text-caption">
            {prediction ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-text-muted">Probability:</span> <span className="ml-2 font-medium text-electric-400">{(prediction.attack_probability * 100).toFixed(2)}%</span></div>
                  <div><span className="text-text-muted">Status:</span> <span className="ml-2 font-medium">{prediction.status}</span></div>
                  <div><span className="text-text-muted">Threshold:</span> <span className="ml-2 font-medium">{(prediction.threshold_used * 100).toFixed(0)}%</span></div>
                  <div><span className="text-text-muted">Mode:</span> <span className="ml-2 font-medium">{prediction.mode}</span></div>
                  <div><span className="text-text-muted">Latency:</span> <span className="ml-2 font-medium">{prediction.latency_ms}ms</span></div>
                  <div><span className="text-text-muted">Received:</span> <span className="ml-2 font-medium">{formatRelativeTime(prediction.received_at)}</span></div>
                </div>
              </>
            ) : (
              <p className="text-text-muted">No prediction data available</p>
            )}
          </div>
        </section>

        <div className="flex gap-3 pt-4 border-t border-border-subtle">
          <Button variant="secondary" onClick={() => { play('click'); navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2)); }} leftIcon={<Upload className="w-4 h-4" />}>
            Copy Diagnostics
          </Button>
          <Button variant="ghost" onClick={() => { play('click'); onClose(); }}>
            Close
          </Button>
        </div>
      </div>
    </Drawer>
  );
}