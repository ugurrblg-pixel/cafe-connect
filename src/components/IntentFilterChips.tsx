import { Purpose } from '@/types';
import { cn } from '@/lib/utils';
import { MessageCircle, Users, Heart } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

type FilterOption = 'all' | Purpose;

interface IntentFilterChipsProps {
  selected: FilterOption;
  onChange: (value: FilterOption) => void;
  className?: string;
}

const filterOptions: { value: FilterOption; label: string; icon?: React.ElementType }[] = [
  { value: 'all', label: 'All' },
  { value: 'friendship', label: 'Friendship', icon: Users },
  { value: 'dating', label: 'Dating', icon: Heart },
  { value: 'chat', label: 'Chat', icon: MessageCircle },
];

export function IntentFilterChips({ selected, onChange, className }: IntentFilterChipsProps) {
  const { t } = useI18n();
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2 scrollbar-hide', className)}>
      {filterOptions.map((option) => {
        const isSelected = selected === option.value;
        const Icon = option.icon;
        
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              isSelected
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {t.intents[option.value]}
          </button>
        );
      })}
    </div>
  );
}

export type { FilterOption };
