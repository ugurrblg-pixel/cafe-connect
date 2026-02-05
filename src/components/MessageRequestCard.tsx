import { InitialsAvatar } from './InitialsAvatar';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MessageRequest {
  id: string;
  presetMessage: string;
  createdAt: Date;
  fromProfile?: {
    display_name: string;
    photo_url: string;
  };
}

interface MessageRequestCardProps {
  request: MessageRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export function MessageRequestCard({ request, onAccept, onReject }: MessageRequestCardProps) {
  const displayName = request.fromProfile?.display_name || 'Someone';
  const photoUrl = request.fromProfile?.photo_url;

  return (
    <div className="card-elevated p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <InitialsAvatar name={displayName} size="sm" className="rounded-full" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{displayName}</p>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            "{request.presetMessage}"
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(request.createdAt, { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReject(request.id)}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-1" />
          Decline
        </Button>
        <Button
          size="sm"
          onClick={() => onAccept(request.id)}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-1" />
          Accept
        </Button>
      </div>
    </div>
  );
}
