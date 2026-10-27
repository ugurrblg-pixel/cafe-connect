import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { VISIBILITY_CHANGED } from "@/lib/visibilityEvents";

// Keep this lightweight: navigation must not eagerly load the map or activity schemas.
export function useActivitiesAvailability() {
  const { user } = useAuth();
  const client = useQueryClient();
  useEffect(() => {
    const clear = () => {
      client.removeQueries({
        predicate: (q) =>
          ["activities", "activity-members", "activity-chat"].includes(
            String(q.queryKey[0]),
          ),
      });
      void client.invalidateQueries({ queryKey: ["activities-available"] });
    };
    window.addEventListener(VISIBILITY_CHANGED, clear);
    return () => window.removeEventListener(VISIBILITY_CHANGED, clear);
  }, [client]);
  return useQuery({
    queryKey: ["activities-available", user?.id],
    enabled: !!user,
    retry: false,
    staleTime: 60000,
    refetchInterval: 60000,
    queryFn: async () => {
      const rpc = supabase.rpc as unknown as (
        name: string,
      ) => Promise<{ data: unknown; error: unknown }>;
      const { data, error } = await rpc("social_activities_available");
      if (error) throw new Error("Aktiviteler kullanılamıyor");
      return data === true;
    },
  });
}
