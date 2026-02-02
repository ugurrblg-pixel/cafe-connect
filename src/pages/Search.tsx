import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CafeCard } from '@/components/CafeCard';
import { mockCafes } from '@/data/mockData';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const filteredCafes = mockCafes.filter(
    (cafe) =>
      cafe.name.toLowerCase().includes(query.toLowerCase()) ||
      cafe.address.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Search" />

      <main className="pt-16 px-4">
        {/* Search Input */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search cafes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-full bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-muted transition-colors">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
          {['Open Now', 'People Here', 'Nearby', 'Top Rated'].map((filter) => (
            <button
              key={filter}
              className="px-4 py-2 rounded-full bg-secondary text-sm font-medium text-secondary-foreground whitespace-nowrap hover:bg-muted transition-colors"
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="grid gap-4">
          {filteredCafes.length > 0 ? (
            filteredCafes.map((cafe, index) => (
              <CafeCard
                key={cafe.id}
                cafe={cafe}
                onClick={() => navigate(`/cafe/${cafe.id}`)}
                style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No cafes found matching "{query}"</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
