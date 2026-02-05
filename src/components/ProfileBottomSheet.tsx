import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PurposeBadge } from './PurposeBadge';
import { MessageRequestModal } from './MessageRequestModal';
import { Purpose } from '@/types';
import { MapPin, MessageCircle } from 'lucide-react';
import { useMessageRequests } from '@/hooks/useMessageRequests';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileUser {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
  purpose: Purpose;
  allowDMs?: boolean;
  checkedInAt?: Date;
  userId?: string;
  cafeId?: string;
}

interface ProfileBottomSheetProps {
  user: ProfileUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cafeId?: string;
}

export function ProfileBottomSheet({ user, open, onOpenChange, cafeId }: ProfileBottomSheetProps) {
  const { user: currentUser, profile } = useAuth();
  const { sendRequest, presetMessages, sentRequests } = useMessageRequests();
  const [showRequestModal, setShowRequestModal] = useState(false);

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const timeAgo = user.checkedInAt
    ? Math.floor((Date.now() - user.checkedInAt.getTime()) / 60000)
    : 0;

  // Check if request already sent
  const alreadySentRequest = sentRequests.some(
    r => r.toUserId === (user.userId || user.id) && r.cafeId === cafeId
  );

  // Check if user allows DMs and current user allows DMs
  const canMessage = user.allowDMs !== false && profile?.allow_dms !== false;

  const handleSendRequest = async (message: string) => {
    const targetCafeId = cafeId || user.cafeId;
    const targetUserId = user.userId || user.id;
    
    if (!targetCafeId || !targetUserId) return false;
    
    return await sendRequest(targetUserId, targetCafeId, message);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader className="sr-only">
            <SheetTitle>{user.name}'s Profile</SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col items-center py-4">
            {/* Profile Photo or Initials */}
            <div className="relative mb-4">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-card shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center border-4 border-card shadow-lg">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {getInitials(user.name)}
                  </span>
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-accent rounded-full border-2 border-card" />
            </div>

            {/* Name and Purpose */}
            <h2 className="text-xl font-bold text-foreground mb-2">{user.name}</h2>
            <PurposeBadge purpose={user.purpose} />

            {/* Bio */}
            {user.bio && (
              <p className="text-muted-foreground text-center mt-4 px-4 max-w-sm">
                {user.bio}
              </p>
            )}

            {/* Currently Here Indicator */}
            <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-accent/10 rounded-full">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">
                Currently here • {timeAgo} min
              </span>
            </div>

            {/* Message Request Button */}
            {canMessage && currentUser && (
              <Button
                onClick={() => setShowRequestModal(true)}
                disabled={alreadySentRequest}
                className="mt-6 w-full max-w-xs"
                variant={alreadySentRequest ? 'secondary' : 'default'}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {alreadySentRequest ? 'Request Sent' : 'Send Message Request'}
              </Button>
            )}

            {!canMessage && (
              <p className="mt-4 text-sm text-muted-foreground">
                {user.allowDMs === false 
                  ? 'This user is not accepting messages' 
                  : 'Enable DMs in your profile to message others'}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <MessageRequestModal
        open={showRequestModal}
        onOpenChange={setShowRequestModal}
        userName={user.name}
        presetMessages={presetMessages}
        onSend={handleSendRequest}
      />
    </>
  );
}
