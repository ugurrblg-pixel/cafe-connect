import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { PurposeBadge } from "@/components/PurposeBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { ProfilePhotoCarousel } from "@/components/ProfilePhotoCarousel";
import { HobbyDisplay } from "@/components/HobbyDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileVisibility } from "@/hooks/useProfileVisibility";
import { useActiveCheckIn } from "@/hooks/useActiveCheckIn";
import { Switch } from "@/components/ui/switch";
import { ProfileFavorites } from "@/components/ProfileFavorites";
import { usePremium } from "@/hooks/usePremium";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Purpose } from "@/types";
import {
  Edit2,
  Shield,
  HelpCircle,
  LogOut,
  MessageCircle,
  Users,
  Heart,
  Crown,
  ChevronRight,
  Mail,
  Phone,
  User as UserIcon,
  CalendarDays,
  Bell,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { VerificationRequest } from "@/components/VerificationRequest";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { AccountDeletionSection } from "@/components/AccountDeletionSection";

interface Profile {
  id: string;
  name: string;
  display_name: string;
  age: number | null;
  bio: string;
  photo_url: string;
  photo_urls: string[];
  purpose: Purpose;
  allow_dms: boolean;
  is_visible: boolean;
  notifications_enabled: boolean;
  hobbies: string[];
  verification_status: string;
  phone: string | null;
  date_of_birth: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut, refreshProfile } = useAuth();
  const { isPremium } = usePremium();
  const visibility = useProfileVisibility();
  const { activeCheckIn } = useActiveCheckIn();
  const { t, formatString } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [purposeSaving, setPurposeSaving] = useState(false);
  const completion = useProfileCompletion();

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setProfile(null);
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile({
          id: data.id,
          name: data.name || user.user_metadata?.name || "Riyo kullanıcısı",
          display_name: data.display_name || "",
          age: data.age,
          bio: data.bio || "",
          photo_url: data.photo_url || "",
          photo_urls: (data.photo_urls as string[]) || [],
          purpose: data.purpose as Purpose,
          allow_dms: data.allow_dms,
          is_visible: data.is_visible ?? true,
          notifications_enabled: data.notifications_enabled ?? true,
          hobbies: (data.hobbies as string[]) || [],
          verification_status: data.verification_status || "none",
          phone: (data as any).phone || null,
          date_of_birth: (data as any).date_of_birth || null,
        });
      }
      setLoading(false);
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const purposes: { value: Purpose; label: string; icon: React.ReactNode }[] = [
    {
      value: "chat",
      label: t.intents.chat,
      icon: <MessageCircle className="w-4 h-4" />,
    },
    {
      value: "friendship",
      label: t.intents.friendship,
      icon: <Users className="w-4 h-4" />,
    },
    {
      value: "dating",
      label: t.intents.dating,
      icon: <Heart className="w-4 h-4" />,
    },
  ];

  const handlePurposeChange = async (purpose: Purpose) => {
    if (!profile || purposeSaving || purpose === profile.purpose) return;
    setPurposeSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ purpose })
        .eq("id", profile.id);
      if (error) throw error;
      setProfile((previous) =>
        previous ? { ...previous, purpose } : previous,
      );
      await refreshProfile();
      toast.success("Tanışma amacın güncellendi");
    } catch {
      toast.error("Amaç kaydedilemedi. Tekrar deneyebilirsin.");
    } finally {
      setPurposeSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch {
      toast.error("Çıkış yapılamadı. Tekrar deneyebilirsin.");
    }
  };

  const displayName =
    profile?.display_name || profile?.name || "Riyo kullanıcısı";

  if (loading) {
    return (
      <PageLayout>
        <div className="profile-showcase mx-auto min-h-screen max-w-[440px] pb-28">
          <main className="pt-6 px-4">
            <div className="flex flex-col items-center py-10">
              <Skeleton className="w-28 h-28 rounded-full mb-4" />
              <Skeleton className="h-7 w-36 mb-2 rounded-xl" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </main>
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <PageLayout>
        <main className="flex min-h-[70vh] items-center justify-center px-6">
          <div className="max-w-sm text-center">
            <UserIcon
              className="mx-auto mb-4 h-10 w-10 text-muted-foreground"
              aria-hidden="true"
            />
            <h1 className="text-xl font-bold">Profil yüklenemedi</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Bağlantını kontrol edip tekrar deneyebilirsin.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-full"
            >
              Tekrar dene
            </Button>
          </div>
        </main>
      </PageLayout>
    );
  }

  const cardClass = "bg-card rounded-2xl p-5 mb-5 border border-border/60";
  const cardShadow = { boxShadow: "var(--shadow-card)" };

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* No Header — clean profile-first layout */}
        <main className="px-5 pt-8">
          <header className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-sans text-4xl font-extrabold leading-none tracking-tight text-primary">
                Riyo
              </h1>
              <p className="mt-0.5 text-sm font-semibold">Profil</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full"
                aria-label="Bildirimler"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full"
                aria-label="Güvenlik ve gizlilik ayarları"
                onClick={() => navigate("/settings/safety")}
              >
                <Shield className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            Sosyal kimlik & tercihler
          </p>
          <h2 className="mb-6 text-3xl font-extrabold leading-tight tracking-tight">
            Bugün kiminle <span className="text-primary">tanışalım?</span>
          </h2>
          <section
            className={cardClass}
            style={cardShadow}
            aria-label="Profil kartın"
          >
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <ProfilePhotoCarousel
                  photos={profile.photo_urls}
                  avatarUrl={profile.photo_url}
                  name={displayName}
                  size="sm"
                />
                {isPremium && (
                  <div className="absolute -bottom-1 -right-1">
                    <PremiumBadge size="sm" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-lg font-bold leading-snug">
                  {displayName}
                  {profile.age ? ", " + profile.age : ""}
                </h2>
                <div className="mt-2">
                  <PurposeBadge purpose={profile.purpose} size="sm" />
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {profile.bio ||
                    "Kendini birkaç cümleyle anlat; ortak bir sohbet konusu bulmak kolaylaşsın."}
                </p>
              </div>
            </div>
            {activeCheckIn && activeCheckIn.expiryTime > new Date() && (
              <button
                className="mt-4 flex w-full items-center gap-2 rounded-xl bg-accent/5 p-3 text-left focus-visible:outline focus-visible:outline-primary"
                onClick={() => navigate("/cafe/" + activeCheckIn.cafeId)}
              >
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">
                    {activeCheckIn.cafeName}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Aktif check-in · Mekana dön
                  </span>
                </span>
              </button>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-accent/5 p-3 text-center">
              <div>
                <p className="text-lg font-bold">
                  {
                    new Set(
                      [profile.photo_url, ...profile.photo_urls].filter(
                        Boolean,
                      ),
                    ).size
                  }
                </p>
                <p className="text-[11px] text-muted-foreground">Fotoğraf</p>
              </div>
              <div>
                <p className="text-lg font-bold">{profile.hobbies.length}</p>
                <p className="text-[11px] text-muted-foreground">İlgi alanı</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="min-h-11 flex-1 rounded-full"
                onClick={() => navigate("/profile/edit")}
              >
                <Edit2 className="h-4 w-4" />
                Profili düzenle
              </Button>
              <Button
                variant="outline"
                className="min-h-11 rounded-full bg-accent/5"
                onClick={() =>
                  document
                    .getElementById("profile-privacy")
                    ?.scrollIntoView({ block: "center", behavior: "auto" })
                }
              >
                <Shield className="h-4 w-4" />
                Görünürlük
              </Button>
            </div>
          </section>
          <section className={cardClass} style={cardShadow}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">
                {completion.missingFields.length
                  ? "Profilini tamamla"
                  : "Profilin hazır"}
              </h2>
              <span className="text-sm font-bold text-primary">
                %{completion.percentage}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Profil tamamlama"
              aria-valuenow={completion.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 rounded-full bg-secondary overflow-hidden"
            >
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {completion.missingFields.length
                ? `${completion.missingFields.join(", ")} ekleyerek kendini daha iyi anlatabilirsin.`
                : "Temel profil bilgilerin tamam. Yeni bir sohbete hazırsın."}
            </p>
            <button
              onClick={() => navigate("/profile/edit")}
              className="mt-3 text-sm text-primary font-semibold"
            >
              Profil bilgilerimi düzenle →
            </button>
          </section>

          {/* Bio */}
          <div className={cardClass} style={cardShadow}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-foreground">
                {t.profile.about}
              </h2>
              <button
                onClick={() => navigate("/profile/edit")}
                aria-label="Profil bilgilerini düzenle"
                className="flex h-11 w-11 items-center justify-center text-primary rounded-xl bg-brand-soft hover:bg-secondary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {profile.bio || t.profile.addBio}
            </p>
          </div>

          {/* Hobbies */}
          {
            <div className={cardClass} style={cardShadow}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-foreground">
                  {t.profile.hobbies}
                </h2>
                <button
                  onClick={() => navigate("/profile/edit")}
                  aria-label="Profil bilgilerini düzenle"
                  className="text-primary p-1 rounded-full hover:bg-primary/10 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <HobbyDisplay hobbies={profile.hobbies} />
              {profile.hobbies.length === 0 && (
                <button
                  onClick={() => navigate("/profile/edit")}
                  className="text-sm text-muted-foreground text-left"
                >
                  Sevdiğin şeyleri ekle; ortak ilgi alanların sohbet başlatmayı
                  kolaylaştırır.{" "}
                  <span className="text-primary">İlgi alanı ekle →</span>
                </button>
              )}
            </div>
          }

          <ProfileFavorites userId={user?.id} />

          {/* Purpose Selection */}
          <div className={cardClass} style={cardShadow}>
            <h2 className="font-semibold text-foreground mb-3">
              {t.profile.imHereFor}
            </h2>
            <div className="flex gap-2">
              {purposes.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => handlePurposeChange(value)}
                  disabled={purposeSaving}
                  aria-pressed={profile.purpose === value}
                  className={`flex-1 py-3 px-3 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                    profile.purpose === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  {icon}
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <section
            id="profile-privacy"
            className={cardClass}
            style={cardShadow}
          >
            <h2 className="mb-4 text-lg font-semibold">Radar & görünürlük</h2>
            <div className="flex items-center justify-between gap-4">
              <div>
                <label
                  htmlFor="profile-visible"
                  className="text-sm font-semibold"
                >
                  Mekan görünürlüğü
                </label>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Aktif check-in ve gizlilik kurallarına göre aynı mekandaki
                  kişiler profilini görebilir.
                </p>
              </div>
              <Switch
                id="profile-visible"
                checked={visibility.visible === true}
                disabled={visibility.visible === null || visibility.saving}
                onCheckedChange={(value) => void visibility.save(value)}
              />
            </div>
            {visibility.error ? (
              <div className="mt-3 text-xs" role="alert">
                Görünürlük ayarın yüklenemedi.
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void visibility.reload()}
                >
                  Tekrar dene
                </Button>
              </div>
            ) : (
              <p
                role="status"
                className="mt-3 text-xs font-medium text-primary"
              >
                {visibility.loading
                  ? "Ayar yükleniyor…"
                  : visibility.saving
                    ? "Kaydediliyor…"
                    : visibility.visible
                      ? "Görünürlüğün açık"
                      : "Profilin gizli"}
              </p>
            )}
            <Button
              variant="ghost"
              className="mt-3 h-auto w-full justify-between whitespace-normal px-0 text-sm"
              onClick={() => navigate("/settings/safety")}
            >
              Gizlilik ve engellenen kişiler
              <ChevronRight className="h-4 w-4" />
            </Button>
          </section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 mt-6">
            Hesabın ve güvenliğin
          </h2>
          {/* Verification */}
          <div className={cardClass} style={cardShadow}>
            <h2 className="font-semibold text-foreground mb-3">
              {t.profile.accountVerification}
            </h2>
            <VerificationRequest
              verificationStatus={profile.verification_status}
              onStatusChange={(status) =>
                setProfile({ ...profile, verification_status: status })
              }
            />
          </div>

          {/* Account Info */}
          <div className={cardClass} style={cardShadow}>
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Hesap Bilgileri
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Bu bilgiler sadece sana görünür.
            </p>
            <div className="space-y-3">
              {user?.email && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">E-posta</p>
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  <p
                    className={`text-sm ${profile.phone ? "font-medium text-foreground" : "text-muted-foreground italic"}`}
                  >
                    {profile.phone || "Eklenmedi"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Doğum Tarihi</p>
                  <p
                    className={`text-sm ${profile.date_of_birth ? "font-medium text-foreground" : "text-muted-foreground italic"}`}
                  >
                    {profile.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString(
                          "tr-TR",
                          { day: "numeric", month: "long", year: "numeric" },
                        )
                      : "Eklenmedi"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Links */}
          <div
            className="bg-card rounded-3xl overflow-hidden mb-4 border border-border/60"
            style={cardShadow}
          >
            {[
              {
                icon: Shield,
                label: t.profile.safetyPrivacy,
                color: "text-accent",
                onClick: () => navigate("/settings/safety"),
              },
              {
                icon: Bell,
                label: "Bildirim ayarları",
                color: "text-primary",
                onClick: () => navigate("/settings/notifications"),
              },
              {
                icon: HelpCircle,
                label: t.profile.helpSupport,
                color: "text-muted-foreground",
                onClick: () => navigate("/settings/help"),
              },
            ].map(({ icon: Icon, label, color, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-secondary/40 transition-colors border-b border-border/40 last:border-b-0"
              >
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="font-medium text-foreground text-sm">
                  {label}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>
            ))}
          </div>

          <section
            className={cardClass}
            style={cardShadow}
            aria-label="Premium"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-amber-50 p-3">
                <Crown className="h-5 w-5 text-amber-700" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Riyo Premium</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {isPremium
                    ? "Hesabında Premium üyelik tanımlı. Üyelik bilgilerini inceleyebilirsin."
                    : "Premium, Boost ve profil ziyaretleri henüz kullanılamıyor. Ücretsiz özellikleri kullanmaya devam edebilirsin."}
                </p>
              </div>
            </div>
            {isPremium ? (
              <Button
                variant="outline"
                className="mt-4 w-full rounded-full"
                onClick={() => navigate("/subscription")}
              >
                Üyelik bilgilerim
              </Button>
            ) : (
              <p className="mt-3 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                Yakında · Satın alma kapalı
              </p>
            )}
          </section>

          {/* Danger Zone */}
          <div
            className="bg-card rounded-[20px] overflow-hidden mb-6 border-0"
            style={cardShadow}
          >
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-secondary/40 transition-colors border-b border-border/40"
            >
              <LogOut className="w-5 h-5 text-destructive" />
              <span className="font-medium text-destructive text-sm">
                {t.profile.signOutLink}
              </span>
            </button>
            <AccountDeletionSection key={user?.id} />
          </div>
        </main>
      </div>
    </PageLayout>
  );
}
