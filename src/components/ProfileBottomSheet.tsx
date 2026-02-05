import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PurposeBadge } from './PurposeBadge';
import { Purpose } from '@/types';
import { MapPin } from 'lucide-react';

interface ProfileUser {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
  purpose: Purpose;
  checkedInAt?: Date;
}

interface ProfileBottomSheetProps {
  user: ProfileUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileBottomSheet({ user, open, onOpenChange }: ProfileBottomSheetProps) {
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

  return (
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
