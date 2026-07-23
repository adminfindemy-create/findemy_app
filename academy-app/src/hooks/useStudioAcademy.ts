import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function useStudioAcademy() {
  return useQuery({
    queryKey: ['studio', 'academy'],
    queryFn: () => api.studio.academy.get(),
  });
}
