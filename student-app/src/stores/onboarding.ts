import { create } from "zustand";
import type { Category } from "@findemy/types";

type OnboardingState = {
  name: string;
  age: string;
  location: string;
  lat: number | null;
  lng: number | null;
  interests: Category[];
  setField: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void;
  setMany: (patch: Partial<Pick<OnboardingState, "name" | "age" | "location" | "lat" | "lng" | "interests">>) => void;
  clear: () => void;
};

export const useOnboarding = create<OnboardingState>((set) => ({
  name: "",
  age: "",
  location: "",
  lat: null,
  lng: null,
  interests: [],
  setField: (key, value) => set({ [key]: value } as Partial<OnboardingState>),
  setMany: (patch) => set(patch as Partial<OnboardingState>),
  clear: () => set({ name: "", age: "", location: "", lat: null, lng: null, interests: [] }),
}));
