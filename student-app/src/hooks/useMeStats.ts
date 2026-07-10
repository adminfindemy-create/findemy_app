import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useMeStats = () =>
  useQuery({
    queryKey: ["me", "stats"],
    queryFn: () => api.me.getStats(),
  });
