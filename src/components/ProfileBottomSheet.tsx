import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from './VerifiedBadge';
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
  age?: number | null;
  isVerified?: boolean;
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

  const returnFocus = useRef<HTMLElement | null>(null);
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
  const isMatched = hasMatchWith(targetUserId, cafeId);
  const existingConversationId = getMatchConversation(targetUserId, cafeId);

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
        <SheetContent onOpenAutoFocus={()=>{returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;}} onCloseAutoFocus={event=>{if(returnFocus.current?.isConnected){event.preventDefault();returnFocus.current.focus();}}} side="bottom" className="mx-auto max-h-[85svh] max-w-[440px] overflow-y-auto rounded-t-[28px] border-border bg-card px-5 pb-8 pt-14 [&>button]:right-3 [&>button]:top-3 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-secondary">
          <SheetHeader className="sr-only">
            <SheetTitle>{user.name} profili</SheetTitle>
            <SheetDescription>Aynı mekanda bulunduğunuz sürece görünen sınırlı profil.</SheetDescription>
          </SheetHeader>

          {/* Action Menu */}
          {currentUser && currentUser.id !== targetUserId && (
            <div className="absolute top-3 left-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Profil işlemleri" className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring">
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

          <div className="flex flex-col items-center pb-4">
            {/* Profile Photo Carousel */}
            <div className="mb-5 w-full max-w-[220px] rounded-3xl border border-border/70 bg-background p-2 shadow-sm">
              <ProfilePhotoCarousel
                photos={user.photoUrls}
                avatarUrl={user.photoUrl}
                name={user.name}
                size="lg"
                enableFullscreen={false}
              />
            </div>

            {/* Name and Purpose */}
            <div className="mb-2 flex max-w-full items-center justify-center gap-2"><h2 className="break-words text-center text-2xl font-extrabold tracking-tight text-foreground">{user.name}{user.age ? `, ${user.age}` : ''}</h2>{user.isVerified && <VerifiedBadge size="sm"/>}</div>
            <p className="mb-3 text-center text-xs text-muted-foreground">Aynı mekânda olduğunuz sürece görünen sınırlı profil</p>
            <PurposeBadge purpose={user.purpose} />

            {/* Bio */}
            {user.bio && (
              <p className="mt-5 w-full break-words rounded-2xl border border-border/70 bg-background p-4 text-sm leading-relaxed text-muted-foreground">
                {user.bio}
              </p>
            )}

            {/* Hobbies */}
            {user.hobbies && user.hobbies.length > 0 && (
              <div className="mt-4 w-full">
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
                disabled={!existingConversationId}
                className="mt-6 h-12 w-full rounded-2xl"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Sohbete git
              </Button>
            )}

            {isMatched && !existingConversationId && <p className="mt-3 text-center text-xs text-muted-foreground">Sohbeti mekan listesindeki Sohbet düğmesinden başlatabilirsin.</p>}

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
