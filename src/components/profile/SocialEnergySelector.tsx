export const ENERGY_OPTIONS = [
  { value: 'quiet', label: 'Sakin & Sessiz', emoji: '🤫', desc: 'Kitap okurum, sessiz otururum' },
  { value: 'balanced', label: 'Dengeli', emoji: '⚖️', desc: 'Duruma göre değişir' },
  { value: 'social', label: 'Sosyal & Konuşkan', emoji: '💬', desc: 'Sohbet etmeyi severim' },
  { value: 'party', label: 'Parti İnsanı', emoji: '🎉', desc: 'Her zaman eğlenceye hazırım' },
] as const;

export type SocialEnergy = typeof ENERGY_OPTIONS[number]['value'];

interface SocialEnergySelectorProps {
  value: string | null;
  onChange: (value: string) => void;
}

export function SocialEnergySelector({ value, onChange }: SocialEnergySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ENERGY_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all ${
            value === option.value
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'border-border hover:bg-secondary/50'
          }`}
        >
          <span className="text-xl">{option.emoji}</span>
          <span className="text-xs font-semibold">{option.label}</span>
          <span className={`text-[10px] leading-tight text-center ${
            value === option.value ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>{option.desc}</span>
        </button>
      ))}
    </div>
  );
}
