import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Coffee, MapPin, MessageCircle, Shield, Users, ChevronRight, Smartphone, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';

type OnboardingStep = 'splash' | 'slides' | 'location' | 'auth';

const ONBOARDING_COMPLETE_KEY = 'riyo_onboarding_complete';

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [step, setStep] = useState<OnboardingStep>('splash');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const locationRequestedRef = useRef(false);

  useEffect(() => {
    const isComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (isComplete === 'true') {
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (step === 'splash') {
      const timer = setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setStep('slides');
          setIsTransitioning(false);
        }, 300);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const slides = [
    {
      title: t.onboarding.slide1Title,
      subtitle: t.onboarding.slide1Subtitle,
      icon: Users,
      accent: 'from-primary/20 to-amber-500/20',
    },
    {
      title: t.onboarding.slide2Title,
      subtitle: t.onboarding.slide2Subtitle,
      icon: MapPin,
      accent: 'from-emerald-500/20 to-primary/20',
    },
    {
      title: t.onboarding.slide3Title,
      subtitle: t.onboarding.slide3Subtitle,
      icon: Shield,
      accent: 'from-violet-500/20 to-primary/20',
    },
  ];

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50 && currentSlide < slides.length - 1) setCurrentSlide(prev => prev + 1);
    if (distance < -50 && currentSlide > 0) setCurrentSlide(prev => prev - 1);
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleSlidesNext = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(prev => prev + 1);
    else setStep('location');
  };

  const handleLocationAllow = async () => {
    if (locationRequestedRef.current || isRequestingLocation) return;
    locationRequestedRef.current = true;
    setIsRequestingLocation(true);
    setLocationError(null);

    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
      });
      completeOnboarding();
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      switch (geoError.code) {
        case geoError.PERMISSION_DENIED: setLocationError(t.onboarding.locationDenied); break;
        case geoError.POSITION_UNAVAILABLE: setLocationError(t.onboarding.locationUnavailable); break;
        case geoError.TIMEOUT: setLocationError(t.onboarding.locationTimeout); break;
        default: setLocationError(t.onboarding.locationGenericError);
      }
      locationRequestedRef.current = false;
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const handleLocationSkip = () => completeOnboarding();

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setStep('auth');
  };

  const handleAuthComplete = () => navigate('/auth');

  // Splash Screen
  if (step === 'splash') {
    return (
      <div className={cn(
        "min-h-screen bg-gradient-to-b from-primary/10 via-background to-background flex flex-col items-center justify-center p-6 transition-opacity duration-300",
        isTransitioning && "opacity-0"
      )}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-40 right-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl animate-pulse delay-500" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/[0.03] rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30 mb-6">
            <Coffee className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Riyo</h1>
          <p className="text-muted-foreground text-center">{t.onboarding.meetPeople}</p>
        </div>
        <div className="absolute bottom-20 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // Onboarding Slides
  if (step === 'slides') {
    const slide = slides[currentSlide];
    const Icon = slide.icon;

    return (
      <div className="min-h-screen bg-background flex flex-col" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="flex justify-end p-4">
          <Button variant="ghost" size="sm" onClick={() => setStep('location')} className="text-muted-foreground">
            {t.onboarding.skip}
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className={cn("w-64 h-64 rounded-full bg-gradient-to-br flex items-center justify-center mb-12 transition-all duration-500", slide.accent)}>
            <div className="w-48 h-48 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-xl">
              <Icon className="w-20 h-20 text-primary" />
            </div>
          </div>
          <div className="text-center animate-fade-in" key={currentSlide}>
            <h2 className="text-2xl font-bold text-foreground mb-3">{slide.title}</h2>
            <p className="text-muted-foreground text-lg">{slide.subtitle}</p>
          </div>
          {currentSlide === 1 && (
            <div className="flex gap-8 mt-8">
              {[
                { icon: MapPin, label: t.onboarding.location, color: 'text-primary', bg: 'bg-primary/10' },
                { icon: Coffee, label: t.onboarding.cafe, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                { icon: MessageCircle, label: t.chat.title, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
              ].map(({ icon: I, label, color, bg }) => (
                <div key={label} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center mb-2`}>
                    <I className={`w-6 h-6 ${color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          )}
          {currentSlide === 2 && (
            <div className="flex gap-4 mt-8">
              <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-sm text-emerald-600 font-medium">✓ {t.onboarding.verified}</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-sm text-primary font-medium">✓ {t.onboarding.realTime}</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-8 pb-12">
          <div className="flex justify-center gap-2 mb-8">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={cn("h-2 rounded-full transition-all duration-300", i === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30")} />
            ))}
          </div>
          <Button onClick={handleSlidesNext} className="w-full h-14 text-lg font-medium rounded-2xl">
            {currentSlide === slides.length - 1 ? t.onboarding.getStarted : t.onboarding.next}
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // Location Permission Screen
  if (step === 'location') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="relative mb-8">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-card shadow-xl flex items-center justify-center">
                <MapPin className="w-14 h-14 text-primary" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            <div className="absolute inset-[-20px] rounded-full border border-primary/10 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3 text-center">{t.onboarding.findNearbyCafes}</h2>
          <p className="text-muted-foreground text-center max-w-xs mb-2">{t.onboarding.locationDesc}</p>
          <p className="text-sm text-muted-foreground/70 text-center max-w-xs">{t.onboarding.locationOnlyCheckin}</p>
          {locationError && (
            <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 max-w-xs">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{locationError}</p>
            </div>
          )}
        </div>
        <div className="p-8 pb-12 space-y-3">
          <Button onClick={handleLocationAllow} disabled={isRequestingLocation} className="w-full h-14 text-lg font-medium rounded-2xl">
            {isRequestingLocation ? (
              <><div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />{t.onboarding.requestingAccess}</>
            ) : (
              <><MapPin className="w-5 h-5 mr-2" />{t.onboarding.allowLocationAccess}</>
            )}
          </Button>
          <Button variant="ghost" onClick={handleLocationSkip} disabled={isRequestingLocation} className="w-full h-12 text-muted-foreground">
            {locationError ? t.onboarding.continueWithout : t.onboarding.notNow}
          </Button>
        </div>
      </div>
    );
  }

  // Auth Entry Screen
  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
            <Coffee className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t.onboarding.welcomeToCafeMeet}</h1>
          <p className="text-muted-foreground text-center">{t.onboarding.createAccountToStart}</p>
        </div>
        <div className="p-8 pb-6 space-y-3">
          <Button onClick={handleAuthComplete} variant="outline" className="w-full h-14 text-base font-medium rounded-2xl border-2">
            <Smartphone className="w-5 h-5 mr-3" />{t.onboarding.continueWithPhone}
          </Button>
          <Button onClick={handleAuthComplete} variant="outline" className="w-full h-14 text-base font-medium rounded-2xl border-2">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t.auth.continueWithGoogle}
          </Button>
          <Button onClick={handleAuthComplete} variant="outline" className="w-full h-14 text-base font-medium rounded-2xl border-2">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            {t.onboarding.continueWithApple}
          </Button>
        </div>
        <div className="px-8 pb-8">
          <p className="text-xs text-muted-foreground/70 text-center leading-relaxed">
            {t.onboarding.agreeToTerms}{' '}
            <span className="text-primary">{t.onboarding.termsOfService}</span>
            {' '}{t.onboarding.and}{' '}
            <span className="text-primary">{t.onboarding.privacyPolicy}</span>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
