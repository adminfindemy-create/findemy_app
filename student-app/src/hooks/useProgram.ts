import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Fetches a single program (named offering) with its nested batches + academy summary.
// Backed by GET /programs/:id.
export const useProgram = (id: string) =>
  useQuery({
    queryKey: ["program", id],
    queryFn: () => api.programs.getById({ id }),
    enabled: !!id,
  });
