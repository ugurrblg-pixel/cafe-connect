import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Zap, 
  ArrowUp, 
  Eye, 
  Clock,
  Lock,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const BOOST_BENEFITS = [
  {
    icon: ArrowUp,
    text: 'Kafede üst sıralarda görünürsün',
  },
  {
    icon: Eye,
    text: 'Daha fazla profil ziyareti',
  },
  {
    icon: Zap,
    text: 'Daha hızlı eşleşme',
  },
];

const DURATION_OPTIONS = [
  { label: '30 Dakika', value: 30 },
  { label: '1 Saat', value: 60 },
  { label: '3 Saat', value: 180 },
];

export default function Boost() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Navigation */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Boost</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10 text-center">
            {/* Animated Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 animate-pulse">
              <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white">Boost</h2>
            <p className="text-white/90 mt-1 text-[15px]">Kafede öne çık</p>
          </div>
        </div>

        {/* Main Boost Card */}
        <div className="relative p-6 rounded-3xl bg-card border-2 border-primary/20 shadow-lg">
          {/* Highlight glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 text-center">
            {/* Timer Circle */}
            <div className="w-32 h-32 mx-auto rounded-full border-4 border-dashed border-muted flex items-center justify-center mb-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-muted-foreground/50">00:00</span>
              </div>
            </div>
            
            {/* Status */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary mb-3">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              <span className="text-sm font-medium text-muted-foreground">Boost Aktif Değil</span>
            </div>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
              Boost aktifken bulunduğun kafede daha fazla kişiye gösterilirsin.
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Boost Ne Sağlar?
          </h3>
          
          <div className="space-y-2">
            {BOOST_BENEFITS.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-foreground">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Duration Options */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Süre Seçenekleri
          </h3>
          
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((option, index) => (
              <button
                key={index}
                disabled
                className="flex-1 py-3 px-4 rounded-xl border border-border bg-secondary/50 text-muted-foreground text-sm font-medium cursor-not-allowed opacity-60 relative"
              >
                {option.label}
                <Lock className="w-3 h-3 absolute top-2 right-2" />
              </button>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="space-y-4 pt-2">
          <Button
            disabled
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-muted text-muted-foreground cursor-not-allowed opacity-70"
          >
            <Lock className="w-5 h-5 mr-2" />
            Boost Yakında
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Boost özelliği çok yakında aktif edilecektir.
          </p>
        </div>

        {/* Info Section */}
        <div className="pt-2 pb-2">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/50">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Boost süresince sadece bulunduğun kafe için geçerlidir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
