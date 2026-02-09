import { useState, useRef } from 'react';
import { Plus, X, Crown, GripVertical, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ProfilePhotoManagerProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

const FREE_PHOTO_LIMIT = 2;
const PREMIUM_PHOTO_LIMIT = 5;

export function ProfilePhotoManager({ photos, onPhotosChange }: ProfilePhotoManagerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const photoLimit = isPremium ? PREMIUM_PHOTO_LIMIT : FREE_PHOTO_LIMIT;
  const currentPhotos = photos.filter(Boolean);
  const canAddMore = currentPhotos.length < photoLimit;
  const lockedSlots = isPremium ? 0 : Math.max(0, PREMIUM_PHOTO_LIMIT - FREE_PHOTO_LIMIT);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir resim dosyası yükleyin');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Resim 5MB\'dan küçük olmalı');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const newPhotos = [...currentPhotos, publicUrl];
      onPhotosChange(newPhotos);
      toast.success('Fotoğraf yüklendi!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = currentPhotos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleSetMainPhoto = (index: number) => {
    if (index === 0) return; // Already main
    const newPhotos = [...currentPhotos];
    const [photo] = newPhotos.splice(index, 1);
    newPhotos.unshift(photo);
    onPhotosChange(newPhotos);
    toast.success('Ana fotoğraf güncellendi');
  };

  const handleDragStart = (index: number) => {
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

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Profil Fotoğrafları
        </label>
        <span className="text-xs text-muted-foreground">
          {currentPhotos.length}/{photoLimit}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Existing Photos */}
        {currentPhotos.map((photo, index) => (
          <div
            key={`${photo}-${index}`}
            draggable
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
            <img
              src={photo}
              alt={`Fotoğraf ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Main Photo Badge */}
            {index === 0 && (
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Ana
              </div>
            )}

            {/* Drag Handle */}
            <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
              <GripVertical className="w-3.5 h-3.5 text-white" />
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => handleRemovePhoto(index)}
              className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-destructive/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-destructive transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>

            {/* Set as Main Button (if not already main) */}
            {index !== 0 && (
              <button
                type="button"
                onClick={() => handleSetMainPhoto(index)}
                className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full hover:bg-black/70 transition-colors"
              >
                Ana yap
              </button>
            )}
          </div>
        ))}

        {/* Add Photo Button */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
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

        {/* Locked Premium Slots */}
        {!isPremium && currentPhotos.length >= FREE_PHOTO_LIMIT && (
          Array.from({ length: lockedSlots }).map((_, index) => (
            <button
              key={`locked-${index}`}
              type="button"
              onClick={() => navigate('/subscription')}
              className="aspect-square rounded-xl border-2 border-dashed border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 flex flex-col items-center justify-center gap-1.5 hover:border-amber-500/50 transition-colors cursor-pointer"
            >
              <Crown className="w-5 h-5 text-amber-500" />
              <span className="text-xs text-amber-600">Premium</span>
            </button>
          ))
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Premium Upsell */}
      {!isPremium && currentPhotos.length >= FREE_PHOTO_LIMIT && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                +3 fotoğraf daha ekle
              </p>
              <p className="text-xs text-muted-foreground">
                Premium ile 5 fotoğrafa kadar yükle
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/subscription')}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white flex-shrink-0"
            >
              Yükselt
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        İlk fotoğraf ana fotoğrafın olarak gösterilir. Sürükleyerek sıralayabilirsin.
      </p>
    </div>
  );
}
