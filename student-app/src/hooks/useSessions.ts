import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

// M2.1: "Pending Classes" feed — next upcoming sessions per enrolled+active batch.
export const useUpcomingSessions = () =>
  useQuery({
    queryKey: ['me', 'sessions', 'upcoming'],
    queryFn: () => api.sessions.upcoming(),
  });
