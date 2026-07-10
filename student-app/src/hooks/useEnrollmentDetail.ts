import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { api } from "@/lib/api";

export function useEnrollmentDetail(id: string) {
  return useQuery({
    queryKey: ["enrollment", id],
    queryFn: () => api.enrollments.get(id),
    enabled: !!id,
  });
}

export const useDiscontinueEnrollment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, immediate, reason }: { id: string; immediate: boolean; reason: string }) =>
      api.enrollments.discontinue(id, { immediate, reason }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["enrollment", id] });
      qc.invalidateQueries({ queryKey: ["me", "enrollments"] });
    },
    onError: (err: any) => {
      Alert.alert("Could not discontinue", err?.message ?? "Please try again.");
    },
  });
};

export const useCancelDiscontinuation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.enrollments.cancelDiscontinue(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["enrollment", id] });
      qc.invalidateQueries({ queryKey: ["me", "enrollments"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message ?? "Please try again.");
    },
  });
};

export const usePauseEnrollment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, duration, reason }: { id: string; duration: string; reason?: string }) =>
      api.enrollments.pause(id, { duration, reason }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["enrollment", id] });
      qc.invalidateQueries({ queryKey: ["me", "enrollments"] });
    },
    onError: (err: any) => {
      Alert.alert("Could not pause", err?.message ?? "Please try again.");
    },
  });
};

export const useResumePause = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, pauseId }: { enrollmentId: string; pauseId: string }) =>
      api.enrollments.resumePause(enrollmentId, pauseId),
    onSuccess: (_, { enrollmentId }) => {
      qc.invalidateQueries({ queryKey: ["enrollment", enrollmentId] });
      qc.invalidateQueries({ queryKey: ["me", "enrollments"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message ?? "Please try again.");
    },
  });
};

export const useTransferEnrollment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      target_batch_id,
      reason,
    }: { id: string; target_batch_id: string; reason?: string }) =>
      api.enrollments.transfer(id, { target_batch_id, reason }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["enrollment", id] });
      qc.invalidateQueries({ queryKey: ["me", "enrollments"] });
    },
    onError: (err: any) => {
      Alert.alert("Could not request transfer", err?.message ?? "Please try again.");
    },
  });
};

export const useSetPreferredPackage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, package_type }: { id: string; package_type: string }) =>
      api.enrollments.setPreferredPackage(id, { package_type }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["enrollment", id] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message ?? "Please try again.");
    },
  });
};
