import { api } from '@/lib/api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

export const useEvents = (type?: string) =>
  useQuery({
    queryKey: ['events', type],
    queryFn: () => api.events.list(type ? { type } : undefined),
  });

export const useEvent = (id: string) =>
  useQuery({
    queryKey: ['events', id],
    queryFn: () => api.events.get({ id }),
    enabled: !!id,
  });

export const useMyEventRegistrations = () =>
  useQuery({
    queryKey: ['me', 'event-registrations'],
    queryFn: () => api.me.getEventRegistrations(),
  });

export const useInfiniteEvents = (type?: string) =>
  useInfiniteQuery({
    queryKey: ['events', 'infinite', type],
    queryFn: ({ pageParam }) => api.events.list({ type, cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });
