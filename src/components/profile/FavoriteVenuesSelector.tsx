import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, X, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Venue {
  id: string;
  name: string;
  address: string;
}

interface FavoriteVenuesSelectorProps {
  userId: string;
  selectedVenueIds: string[];
  onVenuesChange: (venueIds: string[]) => void;
}

const MAX_FAVORITES = 3;

export function FavoriteVenuesSelector({ userId, selectedVenueIds, onVenuesChange }: FavoriteVenuesSelectorProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<Venue[]>([]);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      const { data, error } = await supabase
        .from('cafes')
        .select('id, name, address')
        .order('name')
        .limit(200);

      if (!error && data) {
        setVenues(data);
        // Resolve selected venue IDs to full objects
        const selected = data.filter(v => selectedVenueIds.includes(v.id));
        setSelectedVenues(selected);
      }
      setLoading(false);
    };
    fetchVenues();
  }, []);

  // Sync selectedVenues when selectedVenueIds change externally
  useEffect(() => {
    if (venues.length > 0) {
      setSelectedVenues(venues.filter(v => selectedVenueIds.includes(v.id)));
    }
  }, [selectedVenueIds, venues]);

  const toggleVenue = (venue: Venue) => {
    const isSelected = selectedVenueIds.includes(venue.id);
    let newIds: string[];
    if (isSelected) {
      newIds = selectedVenueIds.filter(id => id !== venue.id);
    } else {
      if (selectedVenueIds.length >= MAX_FAVORITES) return;
      newIds = [...selectedVenueIds, venue.id];
    }
    onVenuesChange(newIds);
  };

  const removeVenue = (venueId: string) => {
    onVenuesChange(selectedVenueIds.filter(id => id !== venueId));
  };

  const filteredVenues = venues.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.address.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">Mekanlar yükleniyor...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Selected venues as badges */}
      {selectedVenues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedVenues.map(venue => (
            <span
              key={venue.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
            >
              <MapPin className="w-3 h-3" />
              {venue.name}
              <button
                onClick={() => removeVenue(venue.id)}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-muted-foreground">
        {selectedVenueIds.length}/{MAX_FAVORITES} mekan seçildi
      </p>

      {/* Add button / Search toggle */}
      {selectedVenueIds.length < MAX_FAVORITES && (
        <>
          {!showSearch ? (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
            >
              <Plus className="w-4 h-4" />
              Mekan ekle
            </button>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Mekan ara..."
                  className="pl-9 h-10"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {filteredVenues.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">Mekan bulunamadı</p>
                ) : (
                  filteredVenues.slice(0, 20).map(venue => {
                    const isSelected = selectedVenueIds.includes(venue.id);
                    return (
                      <button
                        key={venue.id}
                        onClick={() => toggleVenue(venue)}
                        disabled={!isSelected && selectedVenueIds.length >= MAX_FAVORITES}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-secondary/50 disabled:opacity-40'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{venue.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{venue.address}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                onClick={() => { setShowSearch(false); setSearch(''); }}
                className="text-xs text-muted-foreground hover:underline"
              >
                Kapat
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
