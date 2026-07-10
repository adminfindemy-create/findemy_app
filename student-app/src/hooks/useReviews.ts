import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useCreateReview = () =>
  useMutation({
    mutationFn: api.reviews.create,
  });

export const useMyReviews = () =>
  useQuery({
    queryKey: ["me", "reviews"],
    queryFn: () => api.me.getMyReviews(),
  });
