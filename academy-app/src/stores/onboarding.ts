import type { Category } from '@findemy/types';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

export type OnboardingCategory = Category | '';

export type OnboardingState = {
  ownerName: string;
  academyName: string;
  city: string;
  category: OnboardingCategory;
  phone: string;
  setField: <K extends keyof Omit<OnboardingState, 'setField' | 'setMany' | 'clear'>>(
    key: K,
    value: OnboardingState[K]
  ) => void;
  setMany: (
    patch: Partial<
      Pick<OnboardingState, 'ownerName' | 'academyName' | 'city' | 'category' | 'phone'>
    >
  ) => void;
  clear: () => void;
};

const initial = {
  ownerName: '',
  academyName: '',
  city: '',
  category: '' as OnboardingCategory,
  phone: '',
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initial,
      setField: (key, value) => set({ [key]: value } as Partial<OnboardingState>),
      setMany: (patch) => set(patch as Partial<OnboardingState>),
      clear: () => set({ ...initial }),
    }),
    {
      name: 'findemy-admin-onboarding',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
