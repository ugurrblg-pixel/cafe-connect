import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
  completedFields: string[];
}

const PROFILE_FIELDS = [
  { key: 'display_name', label: 'Görünen isim', weight: 30 },
  { key: 'bio', label: 'Hakkında', weight: 25 },
  { key: 'photo_url', label: 'Profil fotoğrafı', weight: 30 },
  { key: 'purpose', label: 'Amaç', weight: 15 },
] as const;

export function useProfileCompletion(): ProfileCompletionStatus {
  const { profile } = useAuth();

  return useMemo(() => {
    if (!profile) {
      return {
        isComplete: false,
        percentage: 0,
        missingFields: PROFILE_FIELDS.map(f => f.label),
        completedFields: [],
      };
    }

    const completedFields: string[] = [];
    const missingFields: string[] = [];
    let totalWeight = 0;

    PROFILE_FIELDS.forEach(field => {
      const value = profile[field.key as keyof typeof profile];
      const hasValue = value && String(value).trim().length > 0;
      
      if (hasValue) {
        completedFields.push(field.label);
        totalWeight += field.weight;
      } else {
        missingFields.push(field.label);
      }
    });

    // Profile is complete if display_name and at least one other field are filled
    const hasDisplayName = profile.display_name && profile.display_name.trim().length > 0;
    const hasBio = profile.bio && profile.bio.trim().length > 0;
    const hasPhoto = profile.photo_url && profile.photo_url.trim().length > 0;
    
    const isComplete = hasDisplayName && (hasBio || hasPhoto);

    return {
      isComplete,
      percentage: totalWeight,
      missingFields,
      completedFields,
    };
  }, [profile]);
}
