import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Eye, 
  Lock, 
  Crown,
  MapPin,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Mock blurred profiles for display
const MOCK_VIEWERS = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
  { id: 4 },
  { id: 5 },
  { id: 6 },
  { id: 7 },
  { id: 8 },
];

function BlurredProfileCard({ index }: { index: number }) {
  // Different placeholder colors for variety
  const gradients = [
    'from-rose-300 to-pink-400',
    'from-amber-300 to-orange-400',
    'from-violet-300 to-purple-400',
    'from-sky-300 to-blue-400',
    'from-emerald-300 to-teal-400',
    'from-fuchsia-300 to-pink-400',
    'from-yellow-300 to-amber-400',
    'from-indigo-300 to-violet-400',
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm">
      {/* Shimmer animation overlay */}
      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ 
            animation: `shimmer 2.5s infinite`,
            animationDelay: `${index * 200}ms` 
          }}
        />
      </div>

      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-xl z-10 bg-white/40 dark:bg-black/40" />
      
      {/* Content (blurred) */}
      <div className="relative p-3">
        {/* Avatar */}
        <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} mb-3`} />
        
        {/* Name & Age placeholder */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded-full w-3/4" />
          <div className="h-3 bg-muted/70 rounded-full w-1/2" />
        </div>

        {/* Cafe badge placeholder */}
        <div className="flex items-center gap-1 mt-3">
          <MapPin className="w-3 h-3 text-muted-foreground/50" />
          <div className="h-2.5 bg-muted/50 rounded-full w-16" />
        </div>
      </div>

      {/* Lock icon overlay */}
      <div className="absolute inset-0 z-30 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default function ProfileViewers() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Shimmer animation keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      {/* Header Navigation */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Profilime Bakanlar</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-rose-400 to-purple-500 p-6">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Eye className="w-7 h-7 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white">Profilime Bakanlar</h2>
            <p className="text-white/90 mt-1 text-[15px]">Seni merak edenler</p>
          </div>
        </div>

        {/* Blurred Profile Grid */}
        <div className="grid grid-cols-2 gap-3">
          {MOCK_VIEWERS.map((viewer, index) => (
            <BlurredProfileCard key={viewer.id} index={index} />
          ))}
        </div>

        {/* Hint Text */}
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            Son 24 saat içinde profilini <span className="font-semibold text-foreground">7 kişi</span> görüntüledi 👀
          </p>
        </div>

        {/* Premium Unlock Card */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/30 shadow-lg overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 mb-3">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            
            <h3 className="font-bold text-foreground text-lg">Kimlerin baktığını gör</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-[240px] mx-auto">
              Premium ile profilini ziyaret edenleri anında öğren.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="space-y-3">
          <Button
            disabled
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-muted text-muted-foreground cursor-not-allowed opacity-70"
          >
            <Lock className="w-5 h-5 mr-2" />
            Premium Yakında
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Bu özellik Premium üyeler içindir.
          </p>
        </div>

        {/* Trust / Info Text */}
        <div className="pt-2 pb-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground/70">
              Ziyaret edenler anonimdir, bildirim gitmez.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
