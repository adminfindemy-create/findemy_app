import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

export function useEventRegistrationStatus(eventId: string) {
  return useQuery({
    queryKey: ['event-registration', eventId],
    queryFn: () => api.events.getRegistration(eventId),
    enabled: !!eventId,
  });
}

export const useRegisterForEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.events.register(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event-registration', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
    },
    onError: (err: any) => {
      Alert.alert('Could not register', err?.message ?? 'Please try again.');
    },
  });
};

export const useCancelEventRegistration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ registrationId, eventId }: { registrationId: string; eventId: string }) =>
      api.events.cancelRegistration(registrationId),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event-registration', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
    },
    onError: (err: any) => {
      Alert.alert('Could not cancel', err?.message ?? 'Please try again.');
    },
  });
};
