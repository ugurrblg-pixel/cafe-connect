import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PurposeBadge } from './PurposeBadge';
import { HobbyDisplay } from './HobbyDisplay';
import { ProfilePhotoCarousel } from './ProfilePhotoCarousel';
import { MessageRequestModal } from './MessageRequestModal';
import { BlockDialog, ReportDialog } from './BlockReportDialog';
import { Purpose } from '@/types';
import { MapPin, MessageCircle, Ban, Flag, MoreVertical } from 'lucide-react';
import { useMessageRequests } from '@/hooks/useMessageRequests';
import { useBlocking } from '@/hooks/useBlocking';
import { useProfileViews } from '@/hooks/useProfileViews';
import { useMatches } from '@/hooks/useMatches';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProfileUser {
  id: string;
  name: string;
  photoUrl: string;
  photoUrls?: string[];
  bio: string;
  purpose: Purpose;
  allowDMs?: boolean;
  checkedInAt?: Date;
  userId?: string;
  cafeId?: string;
  hobbies?: string[];
}

interface ProfileBottomSheetProps {
  user: ProfileUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cafeId?: string;
}

export function ProfileBottomSheet({ user, open, onOpenChange, cafeId }: ProfileBottomSheetProps) {
  const { user: currentUser, profile } = useAuth();
  const { isPremium } = usePremium();
  const { sendRequest, presetMessages, sentRequests } = useMessageRequests();
  const { blockUser, reportUser } = useBlocking();
  const { logProfileView } = useProfileViews();
  const { hasMatchWith, getMatchConversation } = useMatches();
  const navigate = useNavigate();
  
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const targetUserId = user?.userId || user?.id || '';

  // Log profile view when sheet opens
  useEffect(() => {
    if (open && user && currentUser && targetUserId && targetUserId !== currentUser.id) {
      logProfileView(targetUserId, cafeId || null);
    }
  }, [open, user, currentUser, targetUserId, cafeId, logProfileView]);

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

  // Check if matched
  const isMatched = hasMatchWith(targetUserId);
  const existingConversationId = getMatchConversation(targetUserId);

  // Check if request already sent (only relevant for unmatched users)
  const alreadySentRequest = sentRequests.some(
    r => r.toUserId === targetUserId && r.cafeId === cafeId
  );

  // Check if user allows DMs and current user allows DMs
  const canMessage = user.allowDMs !== false && profile?.allow_dms !== false;

  const handleSendRequest = async (message: string) => {
    const targetCafeId = cafeId || user.cafeId;
    
    if (!targetCafeId || !targetUserId) return false;
    
    return await sendRequest(targetUserId, targetCafeId, message);
  };

  const handleBlock = async () => {
    const success = await blockUser(targetUserId);
    if (success) {
      setShowBlockDialog(false);
      onOpenChange(false);
    }
  };

  const handleReport = async (reason: 'spam' | 'harassment' | 'inappropriate', description?: string) => {
    const success = await reportUser(targetUserId, reason, description);
    if (success) {
      setShowReportDialog(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader className="sr-only">
            <SheetTitle>{user.name}'s Profile</SheetTitle>
          </SheetHeader>
          
          {/* Action Menu */}
          {currentUser && currentUser.id !== targetUserId && (
            <div className="absolute top-4 right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                    <MoreVertical className="w-5 h-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border border-border">
                  <DropdownMenuItem 
                    onClick={() => setShowReportDialog(true)} 
                    className="text-destructive focus:text-destructive"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Şikayet Et
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowBlockDialog(true)} 
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Engelle
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          <div className="flex flex-col items-center py-4">
            {/* Profile Photo Carousel */}
            <div className="mb-4 w-full max-w-[200px]">
              <ProfilePhotoCarousel
                photos={user.photoUrls}
                avatarUrl={user.photoUrl}
                name={user.name}
                size="md"
              />
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

            {/* Hobbies */}
            {user.hobbies && user.hobbies.length > 0 && (
              <div className="mt-4 px-4">
                <HobbyDisplay hobbies={user.hobbies} className="justify-center" />
              </div>
            )}

            {/* Currently Here Indicator */}
            <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-accent/10 rounded-full">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">
                Burada • {timeAgo} dk
              </span>
            </div>

            {/* Chat or Message Request Button */}
            {currentUser && currentUser.id !== targetUserId && isMatched && (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  if (existingConversationId) {
                    navigate(`/chat/${existingConversationId}`);
                  }
                }}
                className="mt-6 w-full max-w-xs"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Mesaj Gönder
              </Button>
            )}

            {!isMatched && currentUser && currentUser.id !== targetUserId && (
              <p className="mt-4 text-sm text-muted-foreground">
                Sohbet başlatmak için önce el sallayın 👋
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
      
      <BlockDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        userName={user.name}
        onConfirm={handleBlock}
      />
      
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        userName={user.name}
        onConfirm={handleReport}
      />
    </>
  );
}
