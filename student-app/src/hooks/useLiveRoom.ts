import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function useLiveRoomToken(batchId: string | null) {
  return useQuery({
    queryKey: ['live-room', batchId],
    queryFn: () => api.rooms.getBatchToken(batchId!),
    enabled: !!batchId,
    retry: false,
    staleTime: 0,
  });
}

export function useLiveWorkshopToken(workshopId: string | null) {
  return useQuery({
    queryKey: ['live-room-workshop', workshopId],
    queryFn: () => api.rooms.getWorkshopToken(workshopId!),
    enabled: !!workshopId,
    retry: false,
    staleTime: 0,
  });
}
