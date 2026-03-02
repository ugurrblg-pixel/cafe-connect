import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Coffee, Mail, Lock, User, Eye, EyeOff, Phone, CalendarIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { containsProfanity, getProfanityError } from '@/lib/profanityFilter';
import { useI18n } from '@/contexts/I18nContext';

export default function Auth() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    dateOfBirth: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isLogin && containsProfanity(formData.name)) {
        toast.error(getProfanityError());
        setLoading(false);
        return;
      }

      // Validate phone and DOB for signup
      if (!isLogin) {
        const cleanPhone = formData.phone.replace(/\s/g, '');
        if (!cleanPhone || cleanPhone.length < 10) {
          toast.error('Geçerli bir telefon numarası girin');
          setLoading(false);
          return;
        }
        if (!formData.dateOfBirth) {
          toast.error('Doğum tarihinizi girin');
          setLoading(false);
          return;
        }
        // Validate age (must be at least 18)
        const dob = new Date(formData.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (age < 18) {
          toast.error('18 yaşından büyük olmalısınız');
          setLoading(false);
          return;
        }
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success(t.auth.welcomeBack + '!');
        navigate('/');
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: formData.name,
            },
          },
        });
        if (error) throw error;

        // Save phone and DOB to profile
        if (signUpData.user) {
          const cleanPhone = formData.phone.replace(/\s/g, '');
          await supabase
            .from('profiles')
            .update({ 
              phone: cleanPhone,
              date_of_birth: formData.dateOfBirth || null,
            })
            .eq('user_id', signUpData.user.id);
        }

        toast.success(t.auth.checkEmail);
      }
    } catch (error: any) {
      if (error.message.includes('User already registered')) {
        toast.error(t.auth.emailAlreadyRegistered);
      } else if (error.message.includes('Invalid login credentials')) {
        toast.error(t.auth.invalidCredentials);
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/`,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || t.auth.googleFailed);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center mb-8">
        <img src="/riyo-logo-new.png" alt="Riyo" className="h-12 object-contain" />
        <h1 className="text-2xl font-bold text-foreground mt-3">Riyo</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect over coffee</p>
      </div>

      <div className="w-full max-w-sm card-elevated p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
          {isLogin ? t.auth.welcomeBack : t.auth.createAccount}
        </h2>

        <Button
          type="button"
          variant="outline"
          className="w-full mb-4 h-12"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t.auth.continueWithGoogle}
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t.auth.or}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">{t.auth.name}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t.auth.yourName}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 h-12"
                    required={!isLogin}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon Numarası</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="05XX XXX XX XX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10 h-12"
                    required={!isLogin}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Doğum Tarihi</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="pl-10 h-12"
                    required={!isLogin}
                    max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.password}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 pr-10 h-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                <Link to="/settings/terms" className="text-primary underline">Kullanım Koşullarını</Link>
                {' '}ve{' '}
                <Link to="/settings/privacy" className="text-primary underline">Gizlilik Politikasını</Link>
                {' '}kabul ediyorum.
              </label>
            </div>
          )}

          <Button type="submit" className="w-full h-12" disabled={loading || (!isLogin && !acceptedTerms)}>
            {loading ? t.auth.loading : isLogin ? t.auth.signIn : t.auth.signUp}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? t.auth.noAccount : t.auth.hasAccount}{' '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? t.auth.signUp : t.auth.signIn}
          </button>
        </p>
      </div>
    </div>
  );
}
