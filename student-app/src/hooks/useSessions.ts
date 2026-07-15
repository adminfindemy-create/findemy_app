import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// M2.1: "Pending Classes" feed — next upcoming sessions per enrolled+active batch.
export const useUpcomingSessions = () =>
  useQuery({
    queryKey: ["me", "sessions", "upcoming"],
    queryFn: () => api.sessions.upcoming(),
  });
