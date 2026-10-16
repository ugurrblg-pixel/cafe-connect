import { useState, useRef, useEffect } from 'react';
import { Plus, X, GripVertical, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { privatePhotoPath, privatePhotoReference, prepareProfilePhoto } from '@/lib/privatePhotos';
import { PrivateProfileImage } from './PrivateProfileImage';

interface ProfilePhotoManagerProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  onBusyChange?: (busy: boolean) => void;
}

const MAX_PHOTOS = 5;

export function ProfilePhotoManager({ photos, onPhotosChange, onBusyChange }: ProfilePhotoManagerProps) {
  const { user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const reviewEnabled = import.meta.env.VITE_PHOTO_REVIEW_ENABLED === 'true';
  const [reviewConsent, setReviewConsent] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dragOriginal = useRef<string[]>([]);
  const [unusedPaths, setUnusedPaths] = useState<string[]>([]);

  const currentPhotos = photos.filter(Boolean);
  const canAddMore = currentPhotos.length < MAX_PHOTOS;
  const photoKey = JSON.stringify(currentPhotos);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.storage.from('avatars').list(user.id, { limit: 100 }).then(({ data, error }) => {
      if (!cancelled && !error) {
        const referenced = new Set(currentPhotos.map(privatePhotoPath));
        setUnusedPaths((data || []).filter(item => item.id).map(item => `${user.id}/${item.name}`)
          .filter(path => !referenced.has(path)));
      }
    });
    return () => { cancelled = true; };
  }, [user?.id, photoKey, uploading]);

  const setBusy = (busy: boolean) => { setUploading(busy); onBusyChange?.(busy); };
  const persistPhotos = async (next: string[]) => {
    const paths = next.map(privatePhotoPath);
    if (paths.some(path => !path)) throw new Error('Fotoğraf yolu doğrulanamadı.');
    const { error } = await supabase.rpc('save_own_profile_photos', { object_paths: paths as string[] });
    if (error) throw error;
    onPhotosChange(next);
    await refreshProfile().catch(() => { /* Photo save already succeeded; refresh can retry later. */ });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || uploading || !canAddMore) return;
    if (reviewEnabled && !reviewConsent) { toast.error('Fotoğraf denetimi için izin kutusunu işaretle.'); return; }

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir resim dosyası yükleyin');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Fotoğraf en fazla 20 MB olabilir; yüklemeden önce küçültülür.');
      return;
    }

    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      const prepared = await prepareProfilePhoto(file);
      const fileName = `${user.id}/${crypto.randomUUID()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, prepared, { upsert: false, contentType: 'image/webp' });

      if (uploadError) throw uploadError;
      uploadedPath = fileName;
      if (reviewEnabled) {
        const { data: review, error: reviewError } = await supabase.functions.invoke('moderate-photo', { body: { photoPath: fileName, reviewConsent: true } });
        if (review?.status === 'rejected') throw new Error('Fotoğraf uygunsuz içerik nedeniyle eklenemedi. Başka bir fotoğraf seçebilirsin.');
        if (reviewError || review?.status !== 'accepted') throw new Error('Fotoğraf denetimi tamamlanamadı. Fotoğraf eklenmedi; daha sonra tekrar dene.');
      }

      // OAuth avatars and old public URLs are not valid private storage pointers.
      // A first upload replaces that external avatar instead of failing the entire save.
      await persistPhotos([...currentPhotos.filter(photo => privatePhotoPath(photo)), privatePhotoReference(fileName)]);
      uploadedPath = null;
      toast.success('Fotoğraf kaydedildi. Şimdilik yalnızca sen görebilirsin.');
    } catch (error) {
      if (uploadedPath) {
        // Roll back only this failed upload, never an existing profile photo.
        await supabase.storage.from('avatars').remove([uploadedPath]).catch(() => undefined);
      }
      console.error('Error uploading photo:', error);
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
      toast.error(message.includes('row-level security')
        ? 'Fotoğraf alanında kaydedilmemiş dosyalar olabilir. Aşağıdaki temizleme seçeneğini kullanıp tekrar deneyin.'
        : message || 'Fotoğraf kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async (index: number) => {
    if (uploading) return;
    const newPhotos = currentPhotos.filter((_, i) => i !== index);
    setBusy(true);
    try {
      await persistPhotos(newPhotos);
      const path = privatePhotoPath(currentPhotos[index]);
      if (path) {
        const { data, error } = await supabase.storage.from('avatars').remove([path]);
        if (error || !data?.length) toast.error('Fotoğraf profilden kaldırıldı, fakat dosya temizlenemedi. Tekrar temizlemeyi deneyin.');
      }
    } catch { toast.error('Fotoğraf kaldırılamadı.'); }
    finally { setBusy(false); }
  };

  const handleSetMainPhoto = async (index: number) => {
    if (index === 0 || uploading) return;
    const newPhotos = [...currentPhotos];
    const [photo] = newPhotos.splice(index, 1);
    newPhotos.unshift(photo);
    setBusy(true);
    try { await persistPhotos(newPhotos); toast.success('Ana fotoğraf güncellendi'); }
    catch { toast.error('Fotoğraf sırası kaydedilemedi.'); }
    finally { setBusy(false); }
  };

  const handleDragStart = (index: number) => {
    if (uploading) return;
    dragOriginal.current = [...currentPhotos];
    onBusyChange?.(true);
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPhotos = [...currentPhotos];
    const [draggedPhoto] = newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(index, 0, draggedPhoto);
    onPhotosChange(newPhotos);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    setBusy(true);
    try { await persistPhotos(currentPhotos); }
    catch { onPhotosChange(dragOriginal.current); toast.error('Fotoğraf sırası kaydedilemedi.'); }
    finally { setBusy(false); }
  };

  const cleanupUnused = async () => {
    if (!user || uploading) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.storage.from('avatars').remove(unusedPaths);
      if (error || data?.length !== unusedPaths.length) throw new Error('Temizlik tamamlanamadı.');
      setUnusedPaths([]);
      toast.success('Kaydedilmemiş yüklemeler temizlendi.');
    } catch { toast.error('Temizlik tamamlanamadı. Lütfen tekrar deneyin.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Profil Fotoğrafları
        </label>
        <span className="text-xs text-muted-foreground">
          {currentPhotos.length}/{MAX_PHOTOS}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {currentPhotos.map((photo, index) => (
          <div
            key={`${photo}-${index}`}
            draggable={!uploading}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-move',
              index === 0 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'border-border',
              draggedIndex === index && 'opacity-50 scale-95'
            )}
          >
            <PrivateProfileImage
              src={photo}
              alt={`Fotoğraf ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {index === 0 && (
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Ana
              </div>
            )}

            <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
              <GripVertical className="w-3.5 h-3.5 text-white" />
            </div>

            <button
              type="button"
              disabled={uploading}
              onClick={() => handleRemovePhoto(index)}
              className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-destructive/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-destructive transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" /><span className="sr-only">Fotoğrafı kaldır</span>
            </button>

            {index !== 0 && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => handleSetMainPhoto(index)}
                className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full hover:bg-black/70 transition-colors"
              >
                Ana yap
              </button>
            )}
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || (reviewEnabled && !reviewConsent)}
            className={cn(
              'aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 transition-colors',
              uploading 
                ? 'opacity-50 cursor-wait' 
                : 'hover:border-primary hover:bg-primary/5 cursor-pointer'
            )}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Plus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Ekle</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
      {reviewEnabled && <label className="flex items-start gap-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground"><input type="checkbox" checked={reviewConsent} onChange={e => setReviewConsent(e.target.checked)} disabled={uploading} className="mt-0.5" />Yüklediğim fotoğrafın cinsel içerik, şiddet ve kendine zarar içeriği kontrolü için OpenAI’a gönderilmesine izin veriyorum. Bu işlem hesap doğrulaması değildir.</label>}

      <p className="text-xs text-muted-foreground">
        Fotoğraf değişiklikleri hemen kaydedilir. İlk fotoğraf ana fotoğrafındır.
        İnceleme tamamlanana kadar fotoğraflarını yalnızca sen görebilirsin.
      </p>
      {unusedPaths.length > 0 && (
        <button type="button" disabled={uploading} onClick={cleanupUnused} className="text-xs text-muted-foreground underline">
          Kaydedilmemiş yüklemeleri temizle ({unusedPaths.length})
        </button>
      )}
    </div>
  );
}
