import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

const secureStorage = {
  getItem: async (name: string) => SecureStore.getItemAsync(name),
  setItem: async (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: async (name: string) => SecureStore.deleteItemAsync(name),
};

export type User = {
  id: string;
  name: string;
  phone: string;
  age?: number;
  location?: string;
  lat?: number;
  lng?: number;
  interests?: string[];
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  attendanceOtp: string | null;
  devBypass: boolean;
  pushPermissionDenied: boolean;
  setPushPermissionDenied: (v: boolean) => void;
  setAuth: (payload: {
    access: string;
    refresh: string;
    user: User;
    attendanceOtp: string;
    devBypass?: boolean;
  }) => void;
  setUser: (user: Partial<User>) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      attendanceOtp: null,
      devBypass: false,
      pushPermissionDenied: false,
      setAuth: ({ access, refresh, user, attendanceOtp, devBypass = false }) =>
        set({ accessToken: access, refreshToken: refresh, user, attendanceOtp, devBypass }),
      setUser: (partial) =>
        set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),
      setPushPermissionDenied: (v) => set({ pushPermissionDenied: v }),
      clear: () =>
        set({ accessToken: null, refreshToken: null, user: null, attendanceOtp: null, devBypass: false, pushPermissionDenied: false }),
    }),
    { name: "findemy-auth", storage: createJSONStorage(() => secureStorage) }
  )
);
