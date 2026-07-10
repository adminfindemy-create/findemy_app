import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useBooking = (id: string) =>
  useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.bookings.get({ id }),
  });

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.bookings.create,
    onSuccess: (_, { batch_id }) => {
      qc.invalidateQueries({ queryKey: ["slots", batch_id] });
      qc.invalidateQueries({ queryKey: ["batch-availability", batch_id] });
    },
  });
};

export const useCancelBooking = () => {
  const qc = useQueryClient();
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
      qc.invalidateQueries({ queryKey: ["trials"] });
      qc.invalidateQueries({ queryKey: ["trial"] });
      qc.invalidateQueries({ queryKey: ["booking"] });
    },
  });
};

export const useRescheduleBooking = () =>
  useMutation({
    mutationFn: ({ id, new_trial_at }: { id: string; new_trial_at: string }) =>
      api.bookings.reschedule({ id, new_trial_at }),
  });
