import { create } from 'zustand';

export type InboxFilter = 'new' | 'pending' | 'confirmed' | 'completed';

export type InboxState = {
  filter: InboxFilter;
  lastSeenCount: number;
  newCountSinceLastSeen: number;
  setFilter: (filter: InboxFilter) => void;
  setLastSeen: (count: number) => void;
  bumpNew: () => void;
  resetNew: () => void;
};

export const useInbox = create<InboxState>((set) => ({
  filter: 'new',
  lastSeenCount: 0,
  newCountSinceLastSeen: 0,
  setFilter: (filter) => set({ filter }),
  setLastSeen: (count) => set({ lastSeenCount: count }),
  bumpNew: () => set((state) => ({ newCountSinceLastSeen: state.newCountSinceLastSeen + 1 })),
  resetNew: () => set({ newCountSinceLastSeen: 0 }),
}));
