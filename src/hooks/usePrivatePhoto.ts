import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { privatePhotoPath, PRIVATE_PHOTO_PREFIX } from '@/lib/privatePhotos';
import { useCafePhoto } from '@/hooks/useCafePhoto';

// Temporary display links are never written to profiles or local storage.
export function usePrivatePhoto(reference: string): string | undefined {
  const { user } = useAuth();
  const cafePhoto = useCafePhoto(reference, user?.id);
  const [resolved, setResolved] = useState<{ reference: string; userId: string; url: string } | null>(null);
  const path = privatePhotoPath(reference);
  useEffect(() => {
    if (!path || !user) return;
    let cancelled = false;
    async function resolve() {
      const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path!, 300);
      if (!cancelled) setResolved(!error && data
        ? { reference, userId: user!.id, url: data.signedUrl } : null);
    }
    void resolve();
    const timer = window.setInterval(() => void resolve(), 240_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void resolve(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reference, path, user?.id]);
  if (reference.startsWith('cafephoto:')) return cafePhoto;
  if (!reference.startsWith(PRIVATE_PHOTO_PREFIX)) return reference || undefined;
  return user && resolved?.reference === reference && resolved.userId === user.id ? resolved.url : undefined;
}
