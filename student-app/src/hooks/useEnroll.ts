import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { api } from "@/lib/api";

export function useEnrollmentStatus(batchId: string) {
  return useQuery({
    queryKey: ["enrollment", batchId],
    queryFn: () => api.batches.enrollmentStatus(batchId),
    enabled: !!batchId,
  });
}

export function useEnrollBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, package_type }: { batchId: string; package_type: string }) =>
      api.batches.enroll(batchId, { package_type }),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ["enrollment", batchId] });
      qc.invalidateQueries({ queryKey: ["me", "enrollments"] });
    },
    onError: (err: any) => {
      Alert.alert("Could not enroll", err?.message ?? "Please try again.");
    },
  });
}

export function useUnenrollBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => api.batches.unenroll(batchId),
    onSuccess: (_, batchId) => {
      qc.invalidateQueries({ queryKey: ["enrollment", batchId] });
      qc.invalidateQueries({ queryKey: ["me", "enrollments"] });
    },
  });
}
