import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Predefined hobbies with emojis
export const PRESET_HOBBIES = [
  { id: 'coffee', emoji: '☕', label: 'Kahve' },
  { id: 'music', emoji: '🎵', label: 'Müzik' },
  { id: 'film', emoji: '🎬', label: 'Film' },
  { id: 'books', emoji: '📚', label: 'Kitap' },
  { id: 'sports', emoji: '🏃', label: 'Spor' },
  { id: 'travel', emoji: '✈️', label: 'Seyahat' },
  { id: 'gaming', emoji: '🎮', label: 'Oyun' },
  { id: 'cooking', emoji: '🍳', label: 'Yemek' },
  { id: 'art', emoji: '🎨', label: 'Sanat' },
  { id: 'photography', emoji: '📷', label: 'Fotoğraf' },
  { id: 'nature', emoji: '🌿', label: 'Doğa' },
  { id: 'tech', emoji: '💻', label: 'Teknoloji' },
];

const MAX_HOBBIES = 5;

interface HobbySelectorProps {
  selectedHobbies: string[];
  onHobbiesChange: (hobbies: string[]) => void;
}

export function HobbySelector({ selectedHobbies, onHobbiesChange }: HobbySelectorProps) {
  const [customHobby, setCustomHobby] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const isMaxReached = selectedHobbies.length >= MAX_HOBBIES;

  const toggleHobby = (hobby: string) => {
    if (selectedHobbies.includes(hobby)) {
      onHobbiesChange(selectedHobbies.filter(h => h !== hobby));
    } else if (!isMaxReached) {
      onHobbiesChange([...selectedHobbies, hobby]);
    }
  };

  const addCustomHobby = () => {
    const trimmed = customHobby.trim();
    if (trimmed && !selectedHobbies.includes(trimmed) && !isMaxReached) {
      onHobbiesChange([...selectedHobbies, trimmed]);
      setCustomHobby('');
      setShowCustomInput(false);
    }
  };

  const removeHobby = (hobby: string) => {
    onHobbiesChange(selectedHobbies.filter(h => h !== hobby));
  };

  const getHobbyDisplay = (hobby: string) => {
    const preset = PRESET_HOBBIES.find(p => p.label === hobby);
    return preset ? `${preset.emoji} ${preset.label}` : hobby;
  };

  return (
    <div className="space-y-4">
      {/* Selected Hobbies */}
      {selectedHobbies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedHobbies.map((hobby) => (
            <div
              key={hobby}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium animate-scale-in"
            >
              <span>{getHobbyDisplay(hobby)}</span>
              <button
                onClick={() => removeHobby(hobby)}
                className="ml-0.5 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-muted-foreground">
        {selectedHobbies.length}/{MAX_HOBBIES} hobi seçildi
      </p>

      {/* Preset Hobbies Grid */}
      <div className="flex flex-wrap gap-2">
        {PRESET_HOBBIES.map((hobby) => {
          const isSelected = selectedHobbies.includes(hobby.label);
          const isDisabled = !isSelected && isMaxReached;

          return (
            <button
              key={hobby.id}
              onClick={() => toggleHobby(hobby.label)}
              disabled={isDisabled}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                'border border-border',
                isSelected
                  ? 'bg-primary/10 border-primary text-primary'
                  : isDisabled
                  ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                  : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground hover:border-primary/50'
              )}
            >
              {hobby.emoji} {hobby.label}
            </button>
          );
        })}
      </div>

      {/* Custom Hobby Input */}
      {showCustomInput ? (
        <div className="flex gap-2 animate-fade-in">
          <Input
            value={customHobby}
            onChange={(e) => setCustomHobby(e.target.value)}
            placeholder="Hobini yaz..."
            maxLength={20}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomHobby();
              }
            }}
          />
          <Button
            size="sm"
            onClick={addCustomHobby}
            disabled={!customHobby.trim() || isMaxReached}
          >
            Ekle
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowCustomInput(false);
              setCustomHobby('');
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowCustomInput(true)}
          disabled={isMaxReached}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
            'border border-dashed border-border',
            isMaxReached
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-muted-foreground hover:border-primary hover:text-primary'
          )}
        >
          <Plus className="w-4 h-4" />
          Kendi hobini ekle
        </button>
      )}
    </div>
  );
}
