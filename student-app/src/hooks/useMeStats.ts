import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export const useMeStats = () =>
  useQuery({
    queryKey: ['me', 'stats'],
    queryFn: () => api.me.getStats(),
  });
