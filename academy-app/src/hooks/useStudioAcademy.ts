import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useStudioAcademy() {
  return useQuery({
    queryKey: ['studio', 'academy'],
    queryFn: () => api.studio.academy.get(),
  });
}
