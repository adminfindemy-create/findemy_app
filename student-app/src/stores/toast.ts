import { create } from 'zustand';

export type ToastVariant = 'success' | 'error';

type ToastRequest = { message: string; variant: ToastVariant; nonce: number } | null;

type ToastBus = {
  request: ToastRequest;
  enqueueToast: (message: string, variant?: ToastVariant) => void;
};

export const useToastBus = create<ToastBus>((set) => ({
  request: null,
  enqueueToast: (message, variant = 'success') =>
    set({ request: { message, variant, nonce: Date.now() } }),
}));

/** Imperative entry point for non-component modules (api.ts, hooks). */
export function enqueueToast(message: string, variant: ToastVariant = 'success') {
  useToastBus.getState().enqueueToast(message, variant);
}
