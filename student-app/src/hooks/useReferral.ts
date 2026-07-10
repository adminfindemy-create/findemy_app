import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useReferral() {
  return useQuery({
    queryKey: ["me", "referral"],
    queryFn: () => api.me.referral.get(),
  });
}

export function useReferralHistory() {
  return useQuery({
    queryKey: ["me", "referral", "history"],
    queryFn: () => api.me.referral.history(),
  });
}

export function useClaimReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.me.referral.claim(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "referral"] });
    },
  });
}
