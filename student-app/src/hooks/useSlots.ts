import { api } from '@/lib/api';
import { useQueries, useQuery } from '@tanstack/react-query';

// S2.1: "slots" are retired. Trial booking is against the batch's upcoming class
// sessions (capacity − enrolled headroom). We keep the MergedSlot shape so the
// booking screens change minimally: `id`/`slot_time` are the chosen session datetime
// (which is submitted as `trial_at`); `capacity`/`reserved_count` carry batch headroom.
export type MergedSlot = {
  id: string; // the trial datetime (ISO) — submitted as trial_at
  slot_time: string;
  capacity: number;
  reserved_count: number;
  status?: string;
  batch_id: string;
  coach_name?: string;
};

function timesToSlots(
  data: { available?: number; times?: string[] } | undefined,
  batchId: string,
  date?: string,
  coachName?: string
): MergedSlot[] {
  const available = Number(data?.available ?? 0);
  const times = (data?.times ?? []) as string[];
  return (
    times
      // class times are after 05:30 IST, so the UTC date prefix matches the IST date.
      .filter((time) => !date || time.slice(0, 10) === date)
      .map((time) => ({
        id: time,
        slot_time: time,
        capacity: available, // batch headroom (a trial doesn't consume it)
        reserved_count: 0,
        status: available > 0 ? 'available' : 'full',
        batch_id: batchId,
        coach_name: coachName,
      }))
  );
}

export const useTrialAvailability = (batchId: string) =>
  useQuery({
    queryKey: ['trial-availability', batchId],
    queryFn: () => api.batches.getTrialAvailability({ id: batchId }),
    enabled: !!batchId,
  });

/** Back-compat hook: returns the batch's bookable sessions (optionally filtered to one date). */
export const useBatchSlots = (batchId: string, date: string) => {
  const availabilityQuery = useTrialAvailability(batchId);
  return {
    ...availabilityQuery,
    data: availabilityQuery.data
      ? { slots: timesToSlots(availabilityQuery.data, batchId, date) }
      : undefined,
  };
};

export function useProgramSlots(batchMeta: { id: string; coach_name?: string }[], date: string) {
  const queries = useQueries({
    queries: batchMeta.map((meta) => ({
      queryKey: ['trial-availability', meta.id],
      queryFn: () => api.batches.getTrialAvailability({ id: meta.id }),
      enabled: !!meta.id,
    })),
  });

  const isLoading = queries.some((query) => query.isLoading);
  const isFetching = queries.some((query) => query.isFetching);
  const error = queries.find((query) => query.error)?.error;
  const refetch = () => Promise.all(queries.map((query) => query.refetch()));

  const merged: MergedSlot[] = [];
  queries.forEach((query, idx) => {
    const meta = batchMeta[idx];
    merged.push(...timesToSlots(query.data as any, meta.id, date, meta.coach_name));
  });
  merged.sort((slotA, slotB) => slotA.slot_time.localeCompare(slotB.slot_time));

  return { slots: merged, isLoading, isFetching, error, refetch };
}
