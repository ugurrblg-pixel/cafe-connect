import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CafeImage } from "./CafeImage";
import { Button } from "./ui/button";
import { ChevronRight, Heart } from "lucide-react";
export function ProfileFavorites({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["own-profile-favorites", userId],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_favorite_venues")
        .select("venue_id, cafes(id,name,image_url,address)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
  });
  return (
    <section className="mb-5" aria-labelledby="profile-favorites-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="profile-favorites-title" className="text-lg font-semibold">
          Favori mekanlarım
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={() => navigate("/profile/edit")}
        >
          Düzenle
        </Button>
      </div>
      {query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Favorilerin yükleniyor…
        </p>
      ) : query.isError ? (
        <div role="alert" className="rounded-xl bg-card p-4 text-sm">
          Favoriler yüklenemedi.
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Tekrar dene
          </Button>
        </div>
      ) : query.data?.length ? (
        <div className="space-y-3">
          {query.data.map((row) =>
            row.cafes ? (
              <button
                key={row.venue_id}
                onClick={() => navigate("/cafe/" + row.venue_id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left shadow-sm focus-visible:outline focus-visible:outline-primary"
              >
                <CafeImage
                  cafeId={row.venue_id}
                  imageUrl={row.cafes.image_url}
                  alt={row.cafes.name}
                  aspectRatio="square"
                  className="h-20 w-20 shrink-0 rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-bold">
                    {row.cafes.name}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                    {row.cafes.address || "Favori mekanın"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ) : null,
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <Heart className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-semibold">Sevdiğin mekanları ekle</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Profilini düzenleyerek favori mekanlarını seçebilirsin.
          </p>
          <Button
            variant="outline"
            className="mt-3 rounded-full"
            onClick={() => navigate("/profile/edit")}
          >
            Mekan seç
          </Button>
        </div>
      )}
    </section>
  );
}
