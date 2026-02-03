import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CafeCard } from '@/components/CafeCard';
import { useCafes } from '@/hooks/useCafes';
import { MapPin, Coffee } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Discover() {
  const navigate = useNavigate();
  const [location] = useState('Downtown');
  const { cafes, loading } = useCafes();

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Discover" />

      <main className="pt-16 px-4">
        {/* Location Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-terracotta-light flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your location</p>
            <p className="font-semibold text-foreground">{location}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Active Section */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Coffee className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg text-foreground">Active Nearby</h2>
              </div>
              <div className="grid gap-4">
                {cafes
                  .filter((cafe) => cafe.activeUsers > 0 && cafe.isOpen)
                  .map((cafe, index) => (
                    <CafeCard
                      key={cafe.id}
                      cafe={cafe}
                      onClick={() => navigate(`/cafe/${cafe.id}`)}
                      className="animation-delay-100"
                      style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                    />
                  ))}
                {cafes.filter((cafe) => cafe.activeUsers > 0 && cafe.isOpen).length === 0 && (
                  <p className="text-muted-foreground text-sm py-4">No active cafes nearby. Check in to be the first!</p>
                )}
              </div>
            </section>

            {/* All Cafes */}
            <section>
              <h2 className="font-semibold text-lg text-foreground mb-4">All Cafes</h2>
              <div className="grid gap-4">
                {cafes
                  .filter((cafe) => cafe.activeUsers === 0 || !cafe.isOpen)
                  .map((cafe, index) => (
                    <CafeCard
                      key={cafe.id}
                      cafe={cafe}
                      onClick={() => navigate(`/cafe/${cafe.id}`)}
                      style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                    />
                  ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
