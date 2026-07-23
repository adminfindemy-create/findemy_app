import { api } from '@/lib/api';
import type { Workshop } from '@findemy/types';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

export const useAcademy = (id: string) =>
  useQuery({
    queryKey: ['academy', id],
    queryFn: () => api.academies.getById({ id }),
    enabled: !!id,
  });

export const useAcademyReviews = (id: string) =>
  useInfiniteQuery({
    queryKey: ['academy-reviews', id],
    queryFn: ({ pageParam }) =>
      api.academies.getReviews({ id, query: { cursor: pageParam, limit: 20 } }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

export const useAcademyWorkshops = (id: string) =>
  useQuery<{ items: Workshop[] }>({
    queryKey: ['academy', id, 'workshops'],
    queryFn: () => api.academies.getWorkshops({ id }),
    enabled: !!id,
  });
