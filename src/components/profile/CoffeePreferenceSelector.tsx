import { Coffee } from 'lucide-react';

export const COFFEE_OPTIONS = [
  { value: 'latte', label: 'Latte', emoji: '☕' },
  { value: 'filtre', label: 'Filtre Kahve', emoji: '🫗' },
  { value: 'espresso', label: 'Espresso', emoji: '⚡' },
  { value: 'turk', label: 'Türk Kahvesi', emoji: '🏺' },
  { value: 'cold', label: 'Soğuk Kahve', emoji: '🧊' },
  { value: 'any', label: 'Fark etmez', emoji: '🤷' },
] as const;

export type CoffeePreference = typeof COFFEE_OPTIONS[number]['value'];

interface CoffeePreferenceSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
}

export function CoffeePreferenceSelector({ value, onChange }: CoffeePreferenceSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {COFFEE_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
            value === option.value
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'border-border hover:bg-secondary/50'
          }`}
        >
          <span className="text-lg">{option.emoji}</span>
          <span className="text-xs font-semibold leading-tight text-center">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
