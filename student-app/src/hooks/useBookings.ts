import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useBooking = (id: string) =>
  useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.bookings.get({ id }),
  });

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.bookings.create,
    onSuccess: (_, { batch_id }) => {
      queryClient.invalidateQueries({ queryKey: ["slots", batch_id] });
      queryClient.invalidateQueries({ queryKey: ["batch-availability", batch_id] });
    },
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      acknowledgeNoRefund,
      reason,
    }: {
      id: string;
      acknowledgeNoRefund?: boolean;
      reason?: string;
    }) =>
      api.bookings.cancel({
        id,
        acknowledge_no_refund: acknowledgeNoRefund,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trials"] });
      queryClient.invalidateQueries({ queryKey: ["trial"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
    },
  });
};

export const useRescheduleBooking = () =>
  useMutation({
    mutationFn: ({ id, new_trial_at }: { id: string; new_trial_at: string }) =>
      api.bookings.reschedule({ id, new_trial_at }),
  });
