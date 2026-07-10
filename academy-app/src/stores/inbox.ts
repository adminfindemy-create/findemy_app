import { create } from 'zustand';

export type InboxFilter = 'new' | 'pending' | 'confirmed' | 'completed';

export type InboxState = {
  filter: InboxFilter;
  lastSeenCount: number;
  newCountSinceLastSeen: number;
  setFilter: (f: InboxFilter) => void;
  setLastSeen: (c: number) => void;
  bumpNew: () => void;
  resetNew: () => void;
};

export const useInbox = create<InboxState>((set) => ({
  filter: 'new',
  lastSeenCount: 0,
  newCountSinceLastSeen: 0,
  setFilter: (f) => set({ filter: f }),
  setLastSeen: (c) => set({ lastSeenCount: c }),
  bumpNew: () => set((s) => ({ newCountSinceLastSeen: s.newCountSinceLastSeen + 1 })),
  resetNew: () => set({ newCountSinceLastSeen: 0 }),
}));
