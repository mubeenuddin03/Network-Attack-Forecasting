import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatRelativeTime } from '@/utils/helpers';
import { useActivities } from '@/contexts/DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Activity,
  Wifi,
  WifiOff,
  Cpu,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Upload,
  Settings,
  Shield,
} from 'lucide-react';

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  prediction_update: <Activity className="w-4 h-4" />,
  health_check: <Wifi className="w-4 h-4" />,
  model_loaded: <Cpu className="w-4 h-4" />,
  model_failed: <AlertTriangle className="w-4 h-4" />,
  threshold_changed: <Settings className="w-4 h-4" />,
  api_reconnected: <Wifi className="w-4 h-4" />,
  api_disconnected: <WifiOff className="w-4 h-4" />,
  data_uploaded: <Upload className="w-4 h-4" />,
  forecast_refresh: <RefreshCw className="w-4 h-4" />,
  settings_changed: <Settings className="w-4 h-4" />,
};

const SEVERITY_CONFIG = {
  info: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-electric-400', bg: 'bg-electric-500/15', border: 'border-electric-500/20' },
  success: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-secure-400', bg: 'bg-secure-500/15', border: 'border-secure-500/20' },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20' },
  critical: { icon: <Shield className="w-4 h-4" />, color: 'text-critical-400', bg: 'bg-critical-500/15', border: 'border-critical-500/20' },
};

interface ActivityFeedProps {
  limit?: number;
  className?: string;
}

export function ActivityFeed({ limit = 20, className }: ActivityFeedProps) {
  const activities = useActivities();
  const displayActivities = activities.slice(0, limit);

  return (
    <Card variant="elevated" className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activity Feed</CardTitle>
        <Badge variant="info" size="sm">{activities.length} events</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border-subtle">
          <AnimatePresence mode="popLayout">
            {displayActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 300, delay: index * 50, ease: [0.34, 1.56, 0.64, 1] }}
                className="p-4 hover:bg-surface-800/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    SEVERITY_CONFIG[activity.severity].bg,
                    SEVERITY_CONFIG[activity.severity].color,
                    SEVERITY_CONFIG[activity.severity].border,
                    'border'
                  )}>
                    {ACTIVITY_ICONS[activity.type] || <Activity className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-body-sm font-medium text-text-primary">{activity.message}</p>
                      <span className="text-caption text-text-muted whitespace-nowrap">{formatRelativeTime(activity.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn('text-caption font-medium capitalize', SEVERITY_CONFIG[activity.severity].color)}>
                        {activity.severity}
                      </span>
                      <span className="text-caption text-text-muted">{activity.type.replace('_', ' ')}</span>
                      {activity.metadata && (
                        <span className="text-caption text-text-muted font-mono">
                          {JSON.stringify(activity.metadata).slice(0, 60)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {displayActivities.length === 0 && (
            <div className="p-8 text-center text-text-muted">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No activity recorded yet</p>
              <p className="text-caption mt-1">Events will appear here as the system runs</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface LiveActivityItem {
  type: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export function LiveActivityIndicator({ activities: liveActivities = [], className }: { 
  activities?: LiveActivityItem[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {liveActivities.slice(0, 5).map((activity, index) => (
        <motion.div
          key={`${activity.timestamp}-${index}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 200, delay: index * 100 }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm',
            SEVERITY_CONFIG[activity.severity].bg,
            SEVERITY_CONFIG[activity.severity].color,
            SEVERITY_CONFIG[activity.severity].border,
            'border'
          )}
        >
          <span className="w-2 h-2 rounded-full animate-pulse bg-current flex-shrink-0" />
          <span className="flex-1 truncate">{activity.message}</span>
          <span className="text-caption text-text-muted whitespace-nowrap">{formatRelativeTime(activity.timestamp)}</span>
        </motion.div>
      ))}
    </div>
  );
}