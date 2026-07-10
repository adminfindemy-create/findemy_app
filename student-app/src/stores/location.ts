import { create } from "zustand";

type LocationState = {
  lat: number | null;
  lng: number | null;
  permission: "granted" | "denied" | "prompt" | null;
  setLocation: (lat: number, lng: number) => void;
  setPermission: (permission: "granted" | "denied" | "prompt") => void;
  clear: () => void;
};

export const useLocation = create<LocationState>((set) => ({
  lat: null,
  lng: null,
  permission: null,
  setLocation: (lat, lng) => set({ lat, lng }),
  setPermission: (permission) => set({ permission }),
  clear: () => set({ lat: null, lng: null, permission: null }),
}));
