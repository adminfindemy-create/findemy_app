import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateReviewRequestType } from "@findemy/types";

// S4.3: post a review from an attended trial OR an enrolment (one per academy).
export const useCreateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReviewRequestType) => api.reviews.create(payload),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["academy", vars.academy_id] });
      qc.invalidateQueries({ queryKey: ["me", "classes"] });
    },
  });
};
