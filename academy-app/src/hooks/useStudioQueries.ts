import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import type {
  DashboardData,
  InboxResponse,
  TrialDetail,
  ScheduleItem,
  Batch,
  StudentListItem,
  StudentSnapshot,
  Review,
  ReviewsSummary,
  EarningsData,
  EarningsPeriod,
  Settings,
  Workshop,
  ActivityItem,
  CreateWorkshopRequestType,
  UpdateWorkshopRequestType,
} from '@findemy/types';

export function useStudioDashboard() {
  const token = useAuth((state) => state.accessToken);
  return useQuery<DashboardData>({
    queryKey: ['studio', 'dashboard'],
    queryFn: () => api.studio.dashboard(),
    refetchInterval: 30_000,
    enabled: !!token,
  });
}

export function useStudioInbox({
  status,
  refetchInterval = 20_000,
}: {
  status?: string;
  refetchInterval?: number;
}) {
  const token = useAuth((state) => state.accessToken);
  return useQuery<InboxResponse>({
    queryKey: ['studio', 'inbox', status],
    queryFn: () => api.studio.inbox.list({ status, limit: 20 }),
    refetchInterval,
    refetchIntervalInBackground: false,
    enabled: !!token,
  });
}

export function useStudioTrial(id: string) {
  const token = useAuth((state) => state.accessToken);
  return useQuery<{ trial: TrialDetail; student: StudentSnapshot }>({
    queryKey: ['studio', 'trial', id],
    queryFn: () => api.studio.trials.get(id),
    enabled: !!token && !!id,
  });
}

export function useStudioActivity() {
  const token = useAuth((state) => state.accessToken);
  return useQuery<{ items: ActivityItem[] }>({
    queryKey: ['studio', 'activity'],
    queryFn: () => api.studio.activity.list(),
    enabled: !!token,
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, otp_code }: { id: string; otp_code: string }) =>
      api.studio.trials.markAttendance({ id, otp_code }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'inbox'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'trial', vars.id] });
    },
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.studio.trials.markNoShow(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'inbox'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'trial', id] });
    },
  });
}

export function useStudioSchedule({ week_start }: { week_start: string }) {
  const token = useAuth((state) => state.accessToken);
  return useQuery<{ days: { date: string; items: ScheduleItem[] }[] }>({
    queryKey: ['studio', 'schedule', week_start],
    queryFn: () => api.studio.schedule.get({ week_start }),
    enabled: !!token,
  });
}

export function useStudioBatches() {
  return useQuery<{ items: Batch[] }>({
    queryKey: ['studio', 'batches'],
    queryFn: () => api.studio.batches.list(),
  });
}

export function useStudioBatch(id: string) {
  const token = useAuth((state) => state.accessToken);
  return useQuery<{ batch: Batch }>({
    queryKey: ['studio', 'batch', id],
    queryFn: () => api.studio.batches.get(id),
    enabled: !!token && !!id,
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    // Batches are created under a program. Title/category/description are owned by the
    // program and derived server-side, so the batch form no longer sends them.
    mutationFn: (body: {
      program_id: string; level: string;
      capacity: number; trial_fee_paise: number;
      monthly_fee_paise: number; coach_id: string;
      quarterly_discount_bps?: number; annual_discount_bps?: number;
      sessions_per_month?: number;
      mode?: 'in-studio' | 'online';
      timings?: { day_of_week: number; start_time: string; duration_min: number }[];
    }) => api.studio.batches.create(body),
    onSuccess: (_response, vars) => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'programs'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'program', vars.program_id] });
    },
  });
}

// --- Programs ---

export type StudioProgramListItem = {
  id: string;
  title: string;
  category: 'music' | 'dance' | 'arts' | 'yoga';
  description: string | null;
  things_to_know: string[];
  batch_count: number;
  created_at: string;
};

export function useStudioPrograms() {
  return useQuery<{ items: StudioProgramListItem[] }>({
    queryKey: ['studio', 'programs'],
    queryFn: () => api.studio.programs.list() as any,
  });
}

export function useStudioProgram(id: string) {
  const token = useAuth((state) => state.accessToken);
  return useQuery<{ program: any; batches: any[] }>({
    queryKey: ['studio', 'program', id],
    queryFn: () => api.studio.programs.get(id) as any,
    enabled: !!token && !!id,
  });
}

export type ProgramMedia = { url: string; type: 'photo' | 'video' };

export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; category: string; description: string; things_to_know?: string[]; media: ProgramMedia[] }) =>
      api.studio.programs.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'programs'] });
    },
  });
}

export function useUpdateProgram(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; description?: string; things_to_know?: string[]; media?: ProgramMedia[] }) =>
      api.studio.programs.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'programs'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'program', id] });
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.studio.programs.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'programs'] });
    },
  });
}

// --- Batch discontinuation (active → closing → ended) ---

export function useBatchDiscontinuation(id: string, enabled = true) {
  const token = useAuth((state) => state.accessToken);
  return useQuery({
    queryKey: ['studio', 'batch', id, 'discontinuation'],
    queryFn: () => api.studio.batches.discontinuation(id),
    enabled: !!token && !!id && enabled,
  });
}

function useBatchLifecycleMutation(id: string, fn: (id: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'batch', id] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'batch', id, 'discontinuation'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'programs'] });
    },
  });
}

export function useDiscontinueBatch(id: string) {
  return useBatchLifecycleMutation(id, (batchId) => api.studio.batches.discontinue(batchId));
}

export function useFinishDiscontinuation(id: string) {
  return useBatchLifecycleMutation(id, (batchId) => api.studio.batches.finishDiscontinuation(batchId));
}

export function useRefundBlocker(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => api.studio.batches.refundDiscontinuation(id, enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'batch', id, 'discontinuation'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'students'] });
    },
  });
}

export function useUpdateBatch(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title?: string; category?: 'music' | 'dance' | 'arts' | 'yoga';
      level?: string; capacity?: number;
      description?: string; things_to_know?: string[];
      trial_fee_paise?: number; monthly_fee_paise?: number;
      coach_id?: string; status?: 'active' | 'inactive';
      quarterly_discount_bps?: number; annual_discount_bps?: number;
      sessions_per_month?: number;
      mode?: 'in-studio' | 'online';
      timings?: { day_of_week: number; start_time: string; duration_min: number }[];
    }) => api.studio.batches.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'batch', id] });
    },
  });
}

// S3.2: live "N of M checked in" roster (scanned / not-yet). Polls while the QR is shown.
export function useSessionAttendance({ batchId, date, enabled = true }: { batchId: string; date?: string; enabled?: boolean }) {
  const token = useAuth((state) => state.accessToken);
  return useQuery({
    queryKey: ['studio', 'batch', batchId, 'session-attendance', date ?? 'today'],
    queryFn: () => api.studio.batches.attendance.sessionAttendance(batchId, date),
    enabled: !!token && !!batchId && enabled,
    // Live poll only for the current session; a past record is static.
    refetchInterval: enabled && !date ? 5000 : false,
  });
}

// S3.2: issue today's QR check-in token for an in-studio session.
export function useCheckinToken() {
  return useMutation({
    mutationFn: (batchId: string) => api.studio.batches.attendance.checkinToken(batchId),
  });
}

// S3.3: academy "Start live class" → host token for the batch's 100ms room.
export function useStartLive() {
  return useMutation({
    mutationFn: (batchId: string) => api.rooms.startLive(batchId),
  });
}

export function useStudioStudents({ q, batch_id, attendance_tier }: { q?: string; batch_id?: string; attendance_tier?: string } = {}) {
  return useQuery<{ items: StudentListItem[]; next_cursor: string | null }>({
    queryKey: ['studio', 'students', q, batch_id, attendance_tier],
    queryFn: () => api.studio.students.list({ q, batch_id, attendance_tier, limit: 20 }),
  });
}

export function useStudioStudent(id: string) {
  return useQuery<{
    student: StudentSnapshot;
    enrollments: any[];
    trial_history: any[];
    attendance_history: any[];
  }>({
    queryKey: ['studio', 'student', id],
    queryFn: () => api.studio.students.get(id),
  });
}

export function useStudioReviews(filter?: 'all' | 'needs_reply' | 'replied' | '5' | 'lte3') {
  return useQuery<{ items: Review[]; summary?: ReviewsSummary; next_cursor: string | null }>({
    queryKey: ['studio', 'reviews', filter],
    queryFn: () => api.studio.reviews.list(filter ? { filter } : undefined),
  });
}

export function useStudioReviewsSummary() {
  return useQuery<ReviewsSummary>({
    queryKey: ['studio', 'reviews', 'summary'],
    queryFn: () => api.studio.reviews.summary(),
  });
}

export function useRespondReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      api.studio.reviews.respond({ id, response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'reviews'] });
    },
  });
}

export function useStudioEarnings(
  { period, from, to, category }: { period?: EarningsPeriod; from?: string; to?: string; category?: 'trial' | 'enrollment' | 'workshop' } = {},
) {
  return useQuery<EarningsData>({
    queryKey: ['studio', 'earnings', period, from, to, category],
    queryFn: () => api.studio.earnings.get({ period, from, to, category }),
  });
}

export function useStudioSettings() {
  return useQuery<{ settings: Settings }>({
    queryKey: ['studio', 'settings'],
    queryFn: () => api.studio.settings.get(),
  });
}

// Deep-merge a partial settings patch into the cached object so toggles
// reflect instantly. Mirrors the server-side merge that Group A implemented
// in `mutationFn`; here it only drives the optimistic cache value.
function mergeSettings(base: any, patch: any): any {
  if (patch == null || typeof patch !== 'object') return patch;
  const merged: any = Array.isArray(base) ? [...(base ?? [])] : { ...(base ?? {}) };
  for (const key of Object.keys(patch)) {
    const patchValue = patch[key];
    merged[key] =
      patchValue != null && typeof patchValue === 'object' && !Array.isArray(patchValue)
        ? mergeSettings(merged[key], patchValue)
        : patchValue;
  }
  return merged;
}

export function useUpdateStudioSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: any) => api.studio.settings.update(req),
    onMutate: async (patch: any) => {
      await queryClient.cancelQueries({ queryKey: ['studio', 'settings'] });
      const previous = queryClient.getQueryData<{ settings: Settings }>(['studio', 'settings']);
      if (previous) {
        queryClient.setQueryData<{ settings: Settings }>(['studio', 'settings'], {
          settings: mergeSettings(previous.settings, patch),
        });
      }
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['studio', 'settings'], ctx.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'settings'] });
    },
  });
}

export function useBatchStudents(batchId: string) {
  return useQuery<{ students: { id: string; name: string; phone: string; age: number | null; attendance_pct: number | null; tier: 'active' | 'irregular' | 'inactive' | null; last_seen: string | null }[] }>({
    queryKey: ['studio', 'batch', batchId, 'students'],
    queryFn: () => api.studio.batches.students(batchId),
    enabled: !!batchId,
  });
}

export function useStudioWorkshops() {
  return useQuery<{ items: Workshop[] }>({
    queryKey: ['studio', 'workshops'],
    queryFn: () => api.studio.workshops.list(),
  });
}

// Who booked a given workshop (academy-scoped roster + contact + payment status).
export function useWorkshopRegistrations(id: string) {
  return useQuery({
    queryKey: ['studio', 'workshop', id, 'registrations'],
    queryFn: () => api.studio.workshops.registrations(id),
    enabled: !!id,
  });
}

export function useCreateWorkshop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkshopRequestType) => api.studio.workshops.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'workshops'] });
    },
  });
}

export function useUpdateWorkshop(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateWorkshopRequestType) => api.studio.workshops.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'workshops'] });
    },
  });
}

export function useDeleteWorkshop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.studio.workshops.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'workshops'] });
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.studio.batches.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'batches'] });
    },
  });
}

export function useStudioCoaches() {
  return useQuery<{ items: any[] }>({
    queryKey: ['studio', 'coaches'],
    queryFn: () => api.studio.coaches.list(),
  });
}

// S4.2: coach detail (profile + assigned batches).
export function useCoach(id: string) {
  return useQuery({
    queryKey: ['studio', 'coach', id],
    queryFn: () => api.studio.coaches.get(id),
    enabled: !!id,
  });
}

// S4.2: assign a coach to a batch — reuses the batch update (backend ownership-checks the coach).
export function useAssignCoachToBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, coachId }: { batchId: string; coachId: string }) =>
      api.studio.batches.update(batchId, { coach_id: coachId }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'coaches'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'coach', vars.coachId] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'batches'] });
    },
  });
}

export function useCreateCoach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; specialty: string; bio?: string; phone?: string; avatar_url?: string | null }) =>
      api.studio.coaches.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'coaches'] });
    },
  });
}

export function useUpdateCoach(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; specialty?: string; bio?: string; phone?: string; avatar_url?: string | null }) =>
      api.studio.coaches.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'coaches'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'coach', id] });
    },
  });
}

export function useDeleteCoach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.studio.coaches.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'coaches'] });
    },
  });
}

// S3.4: cancel a class session → unbilled + make-good (replaces the slot hard-delete).
export function useCancelSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { batch_id: string; session_date: string }) => api.studio.sessions.cancel(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['studio', 'schedule'] });
    },
  });
}

