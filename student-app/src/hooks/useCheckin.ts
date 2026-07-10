import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// S3.2: student scans the academy's in-studio QR → mark present (idempotent).
export const useCheckin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => api.attendance.checkin(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "classes"] });
    },
  });
};
