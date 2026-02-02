import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { UserCard } from '@/components/UserCard';
import { CheckInButton } from '@/components/CheckInButton';
import { mockCafes, mockUsers } from '@/data/mockData';
import { MapPin, Star, Users, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CafeRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const cafe = mockCafes.find((c) => c.id === id);
  const activeUsers = mockUsers.filter((u) => u.cafeId === id);

  if (!cafe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cafe not found</p>
      </div>
    );
  }

  const handleCheckIn = () => {
    setIsCheckedIn(true);
    toast.success("You're now visible at " + cafe.name, {
      description: 'Your presence will expire in 60 minutes',
    });
  };

  const handleCheckOut = () => {
    setIsCheckedIn(false);
    toast.info("You've left " + cafe.name);
  };

  const handleMessage = (userName: string) => {
    toast.info(`Opening chat with ${userName}...`);
    navigate('/messages');
  };

  const handleInteraction = (type: 'wave' | 'coffee' | 'eye', userName: string) => {
    const messages = {
      wave: `👋 You waved at ${userName}!`,
      coffee: `☕ You invited ${userName} for coffee!`,
      eye: `👀 You made eye contact with ${userName}!`,
    };
    toast.success(messages[type]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative h-56">
        <img
          src={cafe.imageUrl}
          alt={cafe.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <Header title="" showBack transparent />
      </div>

      {/* Content */}
      <main className="px-4 -mt-16 relative pb-32">
        {/* Cafe Info Card */}
        <div className="card-elevated p-5 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">{cafe.name}</h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{cafe.address}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-full">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="font-semibold text-sm">{cafe.rating}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Users className="w-4 h-4" />
              <span>{activeUsers.length} people here</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{cafe.isOpen ? 'Open now' : 'Closed'}</span>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <section>
          <h2 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse-soft" />
            People here now
          </h2>

          {activeUsers.length > 0 ? (
            <div className="space-y-3">
              {activeUsers.map((user, index) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onMessage={() => handleMessage(user.name)}
                  onInteraction={(type) => handleInteraction(type, user.name)}
                  style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                />
              ))}
            </div>
          ) : (
            <div className="card-elevated p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-1">No one here yet</p>
              <p className="text-sm text-muted-foreground">Be the first to check in!</p>
            </div>
          )}
        </section>

        {/* Time limit notice */}
        {isCheckedIn && (
          <div className="mt-6 p-4 rounded-2xl bg-secondary flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Auto check-out</p>
              <p>You'll be automatically checked out after 60 minutes for your safety.</p>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Check-in Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-effect border-t border-border safe-bottom">
        <CheckInButton
          isCheckedIn={isCheckedIn}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          cafeName={cafe.name}
        />
      </div>
    </div>
  );
}
