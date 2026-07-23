import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// S3.2: student scans the academy's in-studio QR → mark present (idempotent).
export const useCheckin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => api.attendance.checkin(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'classes'] });
    },
  });
};
