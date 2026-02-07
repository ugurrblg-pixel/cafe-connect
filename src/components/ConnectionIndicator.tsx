import { Wifi, WifiOff, WifiLow } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<ConnectionStatus, {
  icon: typeof Wifi;
  label: string;
  description: string;
  colorClass: string;
  animate?: boolean;
}> = {
  connected: {
    icon: Wifi,
    label: 'Live',
    description: 'Real-time updates active',
    colorClass: 'text-accent',
    animate: false,
  },
  connecting: {
    icon: WifiLow,
    label: 'Connecting',
    description: 'Establishing connection...',
    colorClass: 'text-muted-foreground',
    animate: true,
  },
  reconnecting: {
    icon: WifiLow,
    label: 'Reconnecting',
    description: 'Connection interrupted, retrying...',
    colorClass: 'text-warning',
    animate: true,
  },
  disconnected: {
    icon: WifiOff,
    label: 'Offline',
    description: 'Not connected to real-time updates',
    colorClass: 'text-muted-foreground',
    animate: false,
  },
};

export function ConnectionIndicator({ 
  status, 
  className,
  showLabel = false 
}: ConnectionIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'flex items-center gap-1.5 text-xs transition-all duration-300',
              config.colorClass,
              config.animate && 'animate-pulse',
              className
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {showLabel && (
              <span className="font-medium">{config.label}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">{config.label}</p>
          <p className="text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
