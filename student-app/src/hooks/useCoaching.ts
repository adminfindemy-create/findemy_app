import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

// M4.2: student-side 1:1 coach booking — list/detail/create. The backend
// (M4.1a) already ships create/accept/reject/get/mine; M4.1b (check-in/
// check-out/refund) is landing concurrently in a separate slice, so any of
// those fields on a `CoachBooking` response are read loosely/optionally by
// the screens that consume these hooks, not typed strictly here.

export function useMyCoachBookings() {
  return useQuery({
    queryKey: ['coaching', 'mine'],
    queryFn: () => api.coaching.myRequests(),
  });
}

// Polls while a request is still waiting on the coach (`requested`) or has
// been accepted but payment hasn't captured yet — mirrors
// enrollment/confirmation.tsx's poll-until-confirmed pattern, but without a
// hard timeout: "waiting for a coach to respond" is a much longer horizon
// (minutes/hours) than "waiting for a payment webhook" (seconds), so polling
// just stops naturally once the booking reaches a resolved state instead of
// giving up after a fixed window.
export function useCoachBooking(id: string) {
  return useQuery({
    queryKey: ['coaching', 'booking', id],
    queryFn: () => api.coaching.get({ id }),
    enabled: !!id,
    refetchInterval: (query) => {
      const booking = (query.state.data as any)?.booking;
      if (!booking) return false;
      if (booking.status === 'requested') return 8000;
      if (booking.status === 'accepted' && booking.payment && booking.payment.status !== 'captured')
        return 3000;
      return false;
    },
  });
}

export function useCreateCoachBookingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      coach_id: string;
      mode: 'online' | 'offline';
      proposed_at: string;
      duration_min: number;
    }) => api.coaching.createRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching', 'mine'] });
    },
    onError: (err: any) => {
      Alert.alert('Could not send request', err?.message ?? 'Please try again.');
    },
  });
}
