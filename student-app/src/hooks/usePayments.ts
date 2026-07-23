import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export const usePaymentOrder = (bookingId: string) =>
  useQuery({
    queryKey: ['payment-order', bookingId],
    queryFn: () => api.payments.createOrder({ booking_id: bookingId }),
    enabled: !!bookingId,
  });

export const usePayment = (id: string) =>
  useQuery({
    queryKey: ['payment', id],
    queryFn: () => api.payments.get({ id }),
  });

// M1.3: cross-enrollment payment history (EnrollmentPayment rows), distinct
// from the two hooks above which drive the Razorpay order/status flow.
export const useMyPayments = () =>
  useQuery({
    queryKey: ['me', 'payments'],
    queryFn: () => api.me.getPayments(),
  });

export const usePaymentReceipt = (id: string | null) =>
  useQuery({
    queryKey: ['me', 'payments', id, 'receipt'],
    queryFn: () => api.me.getPaymentReceipt({ id: id as string }),
    enabled: !!id,
  });
