import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { activityRpc, activityTime } from "@/lib/activities";
const rowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    venue_name: z.string(),
    starts_at: z.string(),
    cancelled: z.boolean(),
    host_name: z.string().nullable(),
  }),
);
export default function AdminActivities() {
  const { user } = useAuth();
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["admin-activities", user?.id],
    queryFn: () => activityRpc("admin_social_activities", rowsSchema),
    retry: false,
    staleTime: 0,
  });
  async function cancel() {
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      await activityRpc("admin_social_activities", rowsSchema, {
        action: "cancel",
        target,
      });
      setTarget(null);
      await query.refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-5">
        <h1 className="text-2xl font-bold">Aktiviteler</h1>
        <p className="text-sm text-muted-foreground">
          Son 100 aktivite. Aktivite bildirimleri mevcut Şikayetler / Reports
          bölümüne gelir. İptal edilen planın katılımı ve sohbeti kapanır.
        </p>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          Listeyi yenile
        </Button>
        {query.isPending ? (
          <p role="status">Aktiviteler yükleniyor…</p>
        ) : query.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Aktiviteler okunamadı. Veritabanı kurulumu ve yönetici yetkisini
            kontrol et.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card px-4">
            {query.data?.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <h2 className="break-words font-semibold">{a.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {a.venue_name} · {a.host_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activityTime(a.starts_at)} ·{" "}
                    {a.cancelled ? "İptal edildi" : "Yayımlandı"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={a.cancelled}
                  onClick={() => {
                    setError("");
                    setTarget(a.id);
                  }}
                >
                  Aktiviteyi iptal et
                </Button>
              </li>
            ))}
            {query.data?.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                Henüz aktivite oluşturulmadı.
              </li>
            )}
          </ul>
        )}
        <AlertDialog
          open={!!target}
          onOpenChange={(open) => {
            if (!open && !busy) setTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aktivite iptal edilsin mi?</AlertDialogTitle>
              <AlertDialogDescription>
                Plan listeden kaldırılır. Katılımcıların sohbet erişimi kapanır.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  cancel();
                }}
              >
                {busy ? "İptal ediliyor…" : "Aktiviteyi iptal et"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
