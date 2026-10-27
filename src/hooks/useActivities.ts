import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { activityRpc, activitySchema } from "@/lib/activities";
import { useActivitiesAvailability } from "./useActivitiesAvailability";
export { useActivitiesAvailability } from "./useActivitiesAvailability";

export function useActivities(target?: string) {
  const { user } = useAuth();
  const available = useActivitiesAvailability();
  const query = useQuery({
    queryKey: ["activities", user?.id, target],
    enabled: !!user && available.data === true,
    queryFn: () =>
      activityRpc(
        "list_social_activities",
        z.array(activitySchema),
        target ? { target } : undefined,
      ),
    staleTime: 0,
    refetchInterval: 20000,
    retry: 1,
  });
  return { ...query, available };
}
export function useRefreshActivities() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      predicate: (q) =>
        ["activities", "activity-members", "activity-chat"].includes(
          String(q.queryKey[0]),
        ),
    });
}
