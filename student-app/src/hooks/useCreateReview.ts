import { api } from '@/lib/api';
import type { CreateReviewRequestType } from '@findemy/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// S4.3: post a review from an attended trial OR an enrolment (one per academy).
export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReviewRequestType) => api.reviews.create(payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['academy', vars.academy_id] });
      queryClient.invalidateQueries({ queryKey: ['me', 'classes'] });
    },
  });
};
