import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { InboxItem } from "@/components/InboxItem";
import { ProfileGateModal } from "@/components/ProfileGateModal";
import { ConversationActionSheet } from "@/components/ConversationActionSheet";
import { useInboxData, type InboxConversation } from "@/hooks/useInboxData";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import {
  MessageCircle,
  Coffee,
  Hand,
  Search,
  X,
  MoreHorizontal,
  ArrowRight,
  Users,
  Loader2,
  Send,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { toast } from "sonner";
type Filter = "all" | "unread" | "new" | "active";
export default function Messages() {
  const navigate = useNavigate();
  const { conversations, loading, error, createConversation, refetch } =
    useInboxData();
  const { isComplete: isProfileComplete } = useProfileCompletion();
  const [openingChat, setOpeningChat] = useState<string | null>(null);
  const openingRef = useRef(false);
  const [showProfileGate, setShowProfileGate] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<InboxConversation | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(
    () => conversations.filter((c) => !deleted.has(c.matchId)),
    [conversations, deleted],
  );
  const filtered = useMemo(
    () =>
      visible.filter(
        (c) =>
          (filter === "all" ||
            (filter === "unread" && c.unreadCount > 0) ||
            (filter === "new" && !c.lastMessage) ||
            (filter === "active" && !!c.lastMessage)) &&
          [c.otherUserName, c.cafeName, c.lastMessage?.content || ""]
            .join(" ")
            .toLocaleLowerCase("tr-TR")
            .includes(search.trim().toLocaleLowerCase("tr-TR")),
      ),
    [visible, filter, search],
  );
  const newMatches = filtered.filter((c) => !c.lastMessage);
  const activeChats = filtered.filter((c) => !!c.lastMessage);
  const featured = activeChats.find((c) => c.unreadCount > 0);
  const remaining = activeChats.filter((c) => c.matchId !== featured?.matchId);
  const unread = visible.filter((c) => c.unreadCount > 0).length;
  async function openChat(c: InboxConversation) {
    if (openingRef.current) return;
    if (!isProfileComplete) {
      setShowProfileGate(true);
      return;
    }
    openingRef.current = true;
    setOpeningChat(c.matchId);
    try {
      const id = c.conversationId || (await createConversation(c.matchId));
      if (id) navigate("/chat/" + id);
    } catch {
      toast.error("Sohbet açılamadı. Tekrar deneyebilirsin.");
    } finally {
      openingRef.current = false;
      setOpeningChat(null);
    }
  }
  function actions(c: InboxConversation) {
    setSelectedConversation(c);
    setShowActionSheet(true);
  }
  function hide() {
    if (!selectedConversation) return;
    setDeleted((prev) => new Set(prev).add(selectedConversation.matchId));
    toast.success("Sohbet bu listede gizlendi", {
      description: "Sayfayı yenilediğinde yeniden görünür.",
    });
    setSelectedConversation(null);
  }
  function avatar(c: InboxConversation, size = "h-14 w-14") {
    return c.otherUserPhotoUrl ? (
      <img
        src={c.otherUserPhotoUrl}
        alt={c.otherUserName}
        className={size + " rounded-full object-cover"}
        loading="lazy"
      />
    ) : (
      <InitialsAvatar name={c.otherUserName} size="md" className={size} />
    );
  }
  const filters: [Filter, string][] = [
    ["all", "Tümü"],
    ["new", "Yeni eşleşmeler"],
    ["active", "Aktif sohbetler"],
    ["unread", "Okunmamış"],
  ];
  return (
    <PageLayout>
      <div className="messages-showcase mx-auto min-h-screen max-w-[440px] pb-28">
        <header className="px-5 pb-5 pt-8">
          <h1 className="font-sans text-4xl font-extrabold leading-none tracking-tight text-primary">
            Riyo
          </h1>
          <p className="mt-0.5 font-sans text-sm font-semibold">Mesajlar</p>
        </header>
        <main className="space-y-5 px-5">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Bağlantılar & sohbet
            </p>
            <h2 className="font-sans text-3xl font-extrabold leading-tight tracking-tight">
              Kiminle kahve <span className="text-primary">içelim?</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Kişi, sohbet veya mekan ara"
                placeholder="Kişi, sohbet veya mekan ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-xl border-border/60 bg-card pl-9 pr-9 text-sm shadow-sm"
              />
              {search && (
                <button
                  className="absolute right-0 top-0 flex h-12 w-9 items-center justify-center rounded-xl focus-visible:outline focus-visible:outline-primary"
                  aria-label="Aramayı temizle"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <label htmlFor="inbox-filter" className="sr-only">
              Sohbet filtresi
            </label>
            <select
              id="inbox-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="h-12 max-w-28 rounded-xl border border-border/60 bg-card px-2 text-sm focus-visible:outline-primary"
            >
              {filters.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div
            role="group"
            aria-label="Sohbet kategorisi"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {filters.map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className="shrink-0 rounded-full"
              >
                {label}
                {key === "unread" && unread > 0 ? " (" + unread + ")" : ""}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 rounded-full bg-card"
              onClick={() => navigate("/notifications")}
            >
              <Hand className="h-4 w-4" />
              El sallamalar
            </Button>
          </div>
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-destructive/20 bg-card p-4 text-sm"
            >
              <p>Sohbet listesi yüklenemedi.</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => void refetch()}
              >
                Tekrar dene
              </Button>
            </div>
          )}
          {loading ? (
            <div className="space-y-3" aria-label="Sohbetler yükleniyor">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              {newMatches.length > 0 && (
                <section aria-labelledby="new-matches-title">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2
                      id="new-matches-title"
                      className="message-heading text-lg font-semibold"
                    >
                      Yeni eşleşmeler
                    </h2>
                    <span className="rounded-full bg-accent/10 px-2 py-1 text-[11px] font-bold text-accent">
                      {newMatches.length} eşleşme
                    </span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {newMatches.map((c) => (
                      <button
                        key={c.matchId}
                        disabled={openingChat !== null}
                        onClick={() => void openChat(c)}
                        aria-label={c.otherUserName + " ile sohbet başlat"}
                        className="flex w-28 shrink-0 flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card p-3 text-center shadow-sm focus-visible:outline focus-visible:outline-primary disabled:opacity-50"
                      >
                        <span className="relative mb-1">
                          {avatar(c)}
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                            {openingChat === c.matchId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Hand className="h-3 w-3" />
                            )}
                          </span>
                        </span>
                        <span className="w-full truncate text-sm font-semibold">
                          {c.otherUserName}
                        </span>
                        <span className="w-full truncate text-[11px] text-primary">
                          {c.cafeName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Sohbet başlat
                        </span>
                      </button>
                    ))}
                    <button
                      className="flex w-28 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-accent/5 p-3 text-center focus-visible:outline focus-visible:outline-primary"
                      onClick={() => navigate("/")}
                    >
                      <Coffee className="h-7 w-7 text-primary" />
                      <span className="text-sm font-semibold">
                        Mekanda keşfet
                      </span>
                    </button>
                  </div>
                </section>
              )}
              {featured && (
                <section
                  aria-label="Okunmamış sohbet"
                  className="rounded-3xl border border-border/60 bg-card p-5 shadow-card"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="max-w-full truncate rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">
                      {featured.cafeName || "Yeni mesaj"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Sohbet seçenekleri"
                      className="h-9 w-9 shrink-0"
                      onClick={() => actions(featured)}
                    >
                      <MoreHorizontal />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    {avatar(featured)}
                    <h3 className="message-heading min-w-0 flex-1 break-words text-lg font-semibold">
                      {featured.otherUserName}
                    </h3>
                    <span
                      className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground"
                      aria-label={featured.unreadCount + " okunmamış mesaj"}
                    >
                      {featured.unreadCount > 99 ? "99+" : featured.unreadCount}
                    </span>
                  </div>
                  <p className="my-4 line-clamp-3 break-words rounded-2xl bg-accent/5 p-3 text-[15px] leading-relaxed">
                    {featured.lastMessage?.content}
                  </p>
                  <Button
                    disabled={openingChat !== null}
                    onClick={() => void openChat(featured)}
                    className="h-11 w-full rounded-full"
                  >
                    {openingChat === featured.matchId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Cevap yaz
                  </Button>
                </section>
              )}
              {remaining.length > 0 && (
                <section aria-labelledby="inbox-title">
                  <div className="mb-3 flex items-center justify-between">
                    <h2
                      id="inbox-title"
                      className="message-heading text-lg font-semibold"
                    >
                      Sohbetler
                    </h2>
                    <span
                      role="status"
                      className="text-xs text-muted-foreground"
                    >
                      {activeChats.length} sohbet
                    </span>
                  </div>
                  <div className="space-y-3">
                    {remaining.map((c) => (
                      <div className="relative" key={c.matchId}>
                        <InboxItem
                          id={c.matchId}
                          userName={c.otherUserName}
                          userPhotoUrl={c.otherUserPhotoUrl}
                          lastMessage={c.lastMessage?.content}
                          lastMessageTime={
                            c.lastMessage?.createdAt || c.matchedAt
                          }
                          cafeName={c.cafeName}
                          unreadCount={c.unreadCount}
                          isLoading={openingChat === c.matchId}
                          onClick={() => void openChat(c)}
                          onLongPress={() => actions(c)}
                        />
                        <button
                          aria-label={c.otherUserName + " sohbet seçenekleri"}
                          onClick={() => actions(c)}
                          className="absolute bottom-2 right-2 flex h-8 w-9 items-center justify-center rounded-xl bg-card text-muted-foreground focus-visible:outline focus-visible:outline-primary"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {!filtered.length && !error && (
                <section className="rounded-3xl border border-border/60 bg-card p-6 text-center">
                  <MessageCircle
                    className="mx-auto mb-4 h-10 w-10 text-primary"
                    aria-hidden="true"
                  />
                  <h2 className="message-heading text-xl font-semibold">
                    {visible.length
                      ? "Bu seçimle eşleşen sohbet yok"
                      : "İlk sohbetin bir selamla başlasın"}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {visible.length
                      ? "Kişi veya mekan adını değiştir ya da filtreleri temizle."
                      : "Bir mekana check-in yap, el salla. İlgi karşılıklı olduğunda sohbet açılır."}
                  </p>
                  {visible.length ? (
                    <Button
                      variant="outline"
                      className="mt-4 rounded-full"
                      onClick={() => {
                        setSearch("");
                        setFilter("all");
                      }}
                    >
                      Aramayı ve filtreleri temizle
                    </Button>
                  ) : (
                    <Button
                      className="mt-4 rounded-full"
                      onClick={() => navigate("/")}
                    >
                      Mekan seç
                    </Button>
                  )}
                </section>
              )}
            </>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent/5 p-4">
            <div>
              <p className="text-sm font-semibold">Yeni biriyle tanış</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mekanını seç, bir selam gönder.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-card"
              onClick={() => navigate("/")}
            >
              Mekan seç
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <Button
            variant="outline"
            className="h-auto w-full justify-between whitespace-normal rounded-2xl bg-card p-4 text-left"
            onClick={() => navigate("/activities")}
          >
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              <span>
                <strong className="block text-sm">Grup buluşmaları</strong>
                <span className="block text-xs font-normal text-muted-foreground">
                  Katıldığın aktiviteler ve grup sohbetleri.
                </span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Button>
        </main>
        <ProfileGateModal
          open={showProfileGate}
          onOpenChange={setShowProfileGate}
          action="message"
        />
        <ConversationActionSheet
          open={showActionSheet}
          onOpenChange={setShowActionSheet}
          userName={selectedConversation?.otherUserName || ""}
          onDelete={hide}
        />
      </div>
    </PageLayout>
  );
}
