import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

export const useAllWorkshops = () =>
  useQuery({
    queryKey: ['workshops', 'all'],
    queryFn: () => api.workshops.listAll(),
  });

export const useWorkshop = (id: string) =>
  useQuery({
    queryKey: ['workshops', id],
    queryFn: () => api.workshops.get(id),
    enabled: !!id,
  });

export const useWorkshopRegistrationStatus = (workshopId: string) =>
  useQuery({
    queryKey: ['workshops', workshopId, 'registration'],
    queryFn: () => api.workshops.registrationStatus(workshopId),
    enabled: !!workshopId,
  });

export const useMyWorkshopRegistrations = () =>
  useQuery({
    queryKey: ['me', 'workshop-registrations'],
    queryFn: () => api.me.getWorkshopRegistrations(),
  });

export const useRegisterWorkshop = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workshopId: string) => api.workshops.register(workshopId),
    onSuccess: (_, workshopId) => {
      queryClient.invalidateQueries({ queryKey: ['workshops', workshopId, 'registration'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'workshop-registrations'] });
    },
    onError: (err: any) => {
      Alert.alert('Could not register', err?.message ?? 'Please try again.');
    },
  });
};

export const useCancelWorkshopRegistration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      registrationId,
      acknowledgeNoRefund,
      reason,
    }: {
      registrationId: string;
      workshopId: string;
      acknowledgeNoRefund?: boolean;
      reason?: string;
    }) =>
      api.workshops.cancelRegistration(registrationId, {
        acknowledge_no_refund: acknowledgeNoRefund,
        reason,
      }),
    onSuccess: (_, { workshopId }) => {
      queryClient.invalidateQueries({ queryKey: ['workshops', workshopId, 'registration'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'workshop-registrations'] });
    },
    onError: (err: any) => {
      Alert.alert('Could not cancel', err?.message ?? 'Please try again.');
    },
  });
};
