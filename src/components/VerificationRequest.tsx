import { ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  verificationStatus: string;
  onStatusChange?: (status: string) => void;
}

export function VerificationRequest({ verificationStatus }: Props) {
  const approved = verificationStatus === 'approved';
  const pending = verificationStatus === 'pending';
  const Icon = approved ? CheckCircle2 : pending ? Clock : ShieldCheck;
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-secondary/50 p-4">
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${approved ? 'text-accent' : 'text-muted-foreground'}`} />
      <div>
        <p className="font-medium text-sm">{approved ? 'Doğrulanmış hesap' : pending ? 'Başvurun bekliyor' : 'Hesap doğrulama'}</p>
        <p className="text-xs leading-relaxed text-muted-foreground mt-1">{approved ? 'Mevcut doğrulama durumun korunuyor.' : pending ? 'Mevcut başvurun kayıtlı. İnceleme süresi şu an belirlenmiş değil.' : 'Selfie ile doğrulama henüz kullanılamıyor. Hazır olduğunda başvurunu buradan yapabileceksin.'}</p>
      </div>
    </div>
  );
}
