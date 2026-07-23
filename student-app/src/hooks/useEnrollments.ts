import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function useEnrollments() {
  return useQuery({
    queryKey: ['me', 'enrollments'],
    queryFn: () => api.me.getEnrollments(),
  });
}
