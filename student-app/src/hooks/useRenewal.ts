import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

export function useRenewalOptions(batchId: string) {
  return useQuery({
    queryKey: ['renewal-options', batchId],
    queryFn: () => api.batches.getRenewalOptions(batchId),
    enabled: !!batchId,
  });
}

export const useRenewEnrollment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, package_type }: { batchId: string; package_type: string }) =>
      api.batches.renew(batchId, { package_type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'enrollments'] });
    },
    onError: (err: any) => {
      Alert.alert('Could not renew', err?.message ?? 'Please try again.');
    },
  });
};

export function useBatchAvailability(batchId: string) {
  return useQuery({
    queryKey: ['batch-availability', batchId],
    queryFn: () => api.batches.getAvailability(batchId),
    enabled: !!batchId,
  });
}
