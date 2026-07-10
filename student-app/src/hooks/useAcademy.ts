import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Workshop } from "@findemy/types";

export const useAcademy = (id: string) =>
  useQuery({
    queryKey: ["academy", id],
    queryFn: () => api.academies.getById({ id }),
  });

export const useAcademyReviews = (id: string) =>
  useInfiniteQuery({
    queryKey: ["academy-reviews", id],
    queryFn: ({ pageParam }) =>
      api.academies.getReviews({ id, query: { cursor: pageParam, limit: 20 } }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

export const useAcademyWorkshops = (id: string) =>
  useQuery<{ items: Workshop[] }>({
    queryKey: ["academy", id, "workshops"],
    queryFn: () => api.academies.getWorkshops({ id }),
    enabled: !!id,
  });
