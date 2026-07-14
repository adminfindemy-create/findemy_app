import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useDiscoverTopRated = (location: { lat?: number | null; lng?: number | null }) =>
  useQuery({
    queryKey: ["discover", "top-rated", location],
    queryFn: () =>
      api.academies.list({
        lat: location.lat ?? undefined,
        lng: location.lng ?? undefined,
        sort: "top_rated",
        limit: 5,
      }),
    enabled: location.lat != null && location.lng != null,
  });

export const useInfiniteDiscover = (params: {
  lat?: number | null;
  lng?: number | null;
  category?: string;
  q?: string;
  online?: boolean;
  minRating?: number;
  radius?: number;
  /** Defaults to true. Pass false to skip fetching — e.g. the dedicated
   * search screen shouldn't hit the API before the user has typed anything. */
  enabled?: boolean;
}) =>
  useInfiniteQuery({
    queryKey: ["discover", "nearby", params],
    queryFn: ({ pageParam }) =>
      api.academies.list({
        lat: params.lat ?? undefined,
        lng: params.lng ?? undefined,
        category: params.category || undefined,
        q: params.q || undefined,
        sort: "distance",
        cursor: pageParam,
        limit: 20,
        online: params.online || undefined,
        min_rating: params.minRating || undefined,
        radius_km: params.radius || undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: params.enabled ?? true,
  });
