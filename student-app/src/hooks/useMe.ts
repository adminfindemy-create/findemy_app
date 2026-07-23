import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: () => api.me.get(),
  });
