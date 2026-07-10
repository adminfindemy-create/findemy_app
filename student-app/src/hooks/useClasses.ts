import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// S3.1: the Classes tab data — enrolled batches only (active + past), never trials.
export const useClasses = () =>
  useQuery({
    queryKey: ["me", "classes"],
    queryFn: () => api.me.getClasses(),
  });
