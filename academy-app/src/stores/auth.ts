import type { Academy, AcademyAccount } from '@findemy/types';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  account: AcademyAccount | null;
  academy: Academy | null;
  /** False until SecureStore rehydration completes. Guards must wait on this. */
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setAuth: (payload: {
    access: string;
    refresh: string;
    account: AcademyAccount;
    academy: Academy | null;
  }) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      account: null,
      academy: null,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setAuth: ({ access, refresh, account, academy }) =>
        set({ accessToken: access, refreshToken: refresh, account, academy }),
      clear: () => set({ accessToken: null, refreshToken: null, account: null, academy: null }),
    }),
    {
      name: 'findemy-admin-auth',
      storage: createJSONStorage(() => secureStorage),
      // _hasHydrated is runtime-only; never persist it.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        account: state.account,
        academy: state.academy,
      }),
      // Fires after async SecureStore read resolves (success or error).
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
