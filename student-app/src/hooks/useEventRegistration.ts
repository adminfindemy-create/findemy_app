import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { api } from "@/lib/api";

export function useEventRegistrationStatus(eventId: string) {
  return useQuery({
    queryKey: ["event-registration", eventId],
    queryFn: () => api.events.getRegistration(eventId),
    enabled: !!eventId,
  });
}

export const useRegisterForEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.events.register(eventId),
    onSuccess: (_, eventId) => {
      qc.invalidateQueries({ queryKey: ["event-registration", eventId] });
      qc.invalidateQueries({ queryKey: ["events", eventId] });
    },
    onError: (err: any) => {
      Alert.alert("Could not register", err?.message ?? "Please try again.");
    },
  });
};

export const useCancelEventRegistration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ registrationId, eventId }: { registrationId: string; eventId: string }) =>
      api.events.cancelRegistration(registrationId),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ["event-registration", eventId] });
      qc.invalidateQueries({ queryKey: ["events", eventId] });
    },
    onError: (err: any) => {
      Alert.alert("Could not cancel", err?.message ?? "Please try again.");
    },
  });
};
