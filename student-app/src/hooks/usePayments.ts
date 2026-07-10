import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const usePaymentOrder = (bookingId: string) =>
  useQuery({
    queryKey: ["payment-order", bookingId],
    queryFn: () => api.payments.createOrder({ booking_id: bookingId }),
    enabled: !!bookingId,
  });

export const usePayment = (id: string) =>
  useQuery({
    queryKey: ["payment", id],
    queryFn: () => api.payments.get({ id }),
  });
