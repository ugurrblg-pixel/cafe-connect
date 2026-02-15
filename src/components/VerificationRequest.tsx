import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Camera, CheckCircle2, Clock, Loader2, ShieldCheck, XCircle } from 'lucide-react';

interface Props {
  verificationStatus: string;
  onStatusChange?: (status: string) => void;
}

export function VerificationRequest({ verificationStatus, onStatusChange }: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir fotoğraf seçin');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fotoğraf 5MB\'dan küçük olmalı');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/verification-selfie.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verification_selfie_url: urlData.publicUrl,
          verification_status: 'pending',
          verification_requested_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Doğrulama başvurunuz alındı!');
      onStatusChange?.('pending');
    } catch (err) {
      console.error('Verification upload error:', err);
      toast.error('Yükleme başarısız, tekrar deneyin');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (verificationStatus === 'approved') {
    return (
      <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-xl border border-accent/20">
        <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
        <div>
          <p className="font-medium text-foreground text-sm">Doğrulanmış Hesap</p>
          <p className="text-xs text-muted-foreground">Profiliniz doğrulandı ✓</p>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'pending') {
    return (
      <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <p className="font-medium text-foreground text-sm">Doğrulama Bekleniyor</p>
          <p className="text-xs text-muted-foreground">Selfie'niz inceleniyor, genellikle 24 saat içinde sonuçlanır</p>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'rejected') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl border border-destructive/20">
          <XCircle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-foreground text-sm">Doğrulama Reddedildi</p>
            <p className="text-xs text-muted-foreground">Lütfen yüzünüzün net göründüğü yeni bir selfie ile tekrar deneyin</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
          Tekrar Dene
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileSelect} />
      </div>
    );
  }

  // Status: 'none' — show request button
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className="font-medium text-foreground text-sm">Hesabını Doğrula</p>
          <p className="text-xs text-muted-foreground">Selfie çekerek profilinin gerçek olduğunu kanıtla ve doğrulama rozeti kazan</p>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
        Selfie Çek ve Doğrula
      </Button>
      <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
