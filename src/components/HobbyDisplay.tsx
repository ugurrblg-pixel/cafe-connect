import { PRESET_HOBBIES } from './HobbySelector';

interface HobbyDisplayProps {
  hobbies: string[];
  className?: string;
}

export function HobbyDisplay({ hobbies, className = '' }: HobbyDisplayProps) {
  if (!hobbies || hobbies.length === 0) {
    return null;
  }

  const getHobbyWithEmoji = (hobby: string) => {
    const preset = PRESET_HOBBIES.find(p => p.label === hobby);
    return preset ? `${preset.emoji} ${preset.label}` : `✨ ${hobby}`;
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {hobbies.map((hobby) => (
        <span
          key={hobby}
          className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium"
        >
          {getHobbyWithEmoji(hobby)}
        </span>
      ))}
    </div>
  );
}
