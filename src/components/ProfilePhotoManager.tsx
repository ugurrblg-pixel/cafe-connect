import { useState, useRef } from 'react';
import { Plus, X, GripVertical, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProfilePhotoManagerProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

const MAX_PHOTOS = 5;

export function ProfilePhotoManager({ photos, onPhotosChange }: ProfilePhotoManagerProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const currentPhotos = photos.filter(Boolean);
  const canAddMore = currentPhotos.length < MAX_PHOTOS;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir resim dosyası yükleyin');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Resim 5MB\'dan küçük olmalı');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

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
    if (index === 0) return;
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
          {currentPhotos.length}/{MAX_PHOTOS}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
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
              onClick={() => handleRemovePhoto(index)}
              className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-destructive/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-destructive transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>

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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        İlk fotoğraf ana fotoğrafın olarak gösterilir. Sürükleyerek sıralayabilirsin.
      </p>
    </div>
  );
}
