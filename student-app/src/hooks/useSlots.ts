import { useQuery, useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
  coachName?: string,
): MergedSlot[] {
  const available = Number(data?.available ?? 0);
  const times = (data?.times ?? []) as string[];
  return times
    // class times are after 05:30 IST, so the UTC date prefix matches the IST date.
    .filter((t) => !date || t.slice(0, 10) === date)
    .map((t) => ({
      id: t,
      slot_time: t,
      capacity: available, // batch headroom (a trial doesn't consume it)
      reserved_count: 0,
      status: available > 0 ? "available" : "full",
      batch_id: batchId,
      coach_name: coachName,
    }));
}

export const useTrialAvailability = (batchId: string) =>
  useQuery({
    queryKey: ["trial-availability", batchId],
    queryFn: () => api.batches.getTrialAvailability({ id: batchId }),
    enabled: !!batchId,
  });

/** Back-compat hook: returns the batch's bookable sessions (optionally filtered to one date). */
export const useBatchSlots = (batchId: string, date: string) => {
  const q = useTrialAvailability(batchId);
  return { ...q, data: q.data ? { slots: timesToSlots(q.data, batchId, date) } : undefined };
};

export function useProgramSlots(
  batchMeta: { id: string; coach_name?: string }[],
  date: string
) {
  const queries = useQueries({
    queries: batchMeta.map((b) => ({
      queryKey: ["trial-availability", b.id],
      queryFn: () => api.batches.getTrialAvailability({ id: b.id }),
      enabled: !!b.id,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);
  const error = queries.find((q) => q.error)?.error;
  const refetch = () => Promise.all(queries.map((q) => q.refetch()));

  const merged: MergedSlot[] = [];
  queries.forEach((q, idx) => {
    const meta = batchMeta[idx];
    merged.push(...timesToSlots(q.data as any, meta.id, date, meta.coach_name));
  });
  merged.sort((a, b) => a.slot_time.localeCompare(b.slot_time));

  return { slots: merged, isLoading, isFetching, error, refetch };
}
