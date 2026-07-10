import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useEnrollments() {
  return useQuery({
    queryKey: ["me", "enrollments"],
    queryFn: () => api.me.getEnrollments(),
  });
}
