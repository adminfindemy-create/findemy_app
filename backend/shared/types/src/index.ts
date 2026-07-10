import { z } from 'zod';

export type Category = 'music' | 'dance' | 'arts' | 'yoga';

export const CategoryEnum = z.enum(['music', 'dance', 'arts', 'yoga']);

// ─── Shared platform enums & conventions (S0.1 — master-execution-plan §1) ───
// Money: all amounts are integer **paise** (server-authoritative; clients never
//        compute/send amounts). Field suffix `_paise` / `Paise`.
// Discount: **basis points** (bps); product cap **3000 (30%)**. Field suffix `Bps`.
// Time: store/transport UTC; render IST client-side.

/**
 * Batch / trial delivery mode — canonical **wire** vocabulary.
 * Note: the DB enum `BatchMode` stores `online | offline` where `offline` ≡ in-studio;
 * the API maps `offline → 'in-studio'` on read. (Decision: Option A, no DB migration.)
 */
export const ModeEnum = z.enum(['in-studio', 'online']);
export type Mode = z.infer<typeof ModeEnum>;

/** Subscription plan terms. `biannual` is removed (S0.2) — monthly | quarterly | annual. */
export const PlanEnum = z.enum(['monthly', 'quarterly', 'annual']);
export type Plan = z.infer<typeof PlanEnum>;

// ── Shared contract constants (P2) — values both client and server must agree on.
// Backend-only policy (commission rate, refund windows) lives in backend/api/src/config.ts.
/** Months per plan term (the discount % comes from the batch, S1.3/S2.3). */
export const PLAN_MONTHS: Record<Plan, number> = { monthly: 1, quarterly: 3, annual: 12 };
/** Academy-set discounts cap at 30% (S0.1/S1.3). */
export const DISCOUNT_BPS_CAP = 3000;
/** OTP lengths — login (phone verify) vs trial attendance (S2.2). */
export const OTP_LOGIN_LENGTH = 6;
export const OTP_ATTENDANCE_LENGTH = 4;

/** How attendance is captured, by booking type:
 *  trial → `otp`, in-studio regular class → `qr`, online regular class → `auto_join`. */
export const AttendanceModeEnum = z.enum(['otp', 'qr', 'auto_join']);
export type AttendanceMode = z.infer<typeof AttendanceModeEnum>;

/** Canonical API error codes. Envelope: `{ error: { code, message, fields? } }`. */
export const ApiErrorCodeEnum = z.enum([
  'VALIDATION', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'RATE_LIMITED', 'INTERNAL', 'CONFIG',
  'OTP_EXPIRED', 'OTP_INVALID', 'OTP_MISMATCH',
  'SLOT_UNAVAILABLE', 'RESCHEDULE_LIMIT', 'CANCELLATION_WINDOW_CLOSED', 'ALREADY_CANCELLED',
  'NOT_ENROLLED', 'NOT_REGISTERED', 'REGISTRATION_CLOSED', 'NOT_IN_SESSION', 'NOT_ONLINE',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeEnum>;

export const OtpRequest = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  role: z.enum(['student', 'academy']),
});

// Legacy alias
export const LoginRequest = OtpRequest;

export const OtpVerifyRequest = z.object({
  otp_id: z.string(),
  code: z.string().length(6),
});

export const VerifyOtpRequest = OtpVerifyRequest;

export const RefreshRequest = z.object({
  refresh_token: z.string(),
});

export const LogoutRequest = z.object({
  refresh_token: z.string(),
});

export const OnboardingRequest = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(3).max(100).optional(),
  location: z.string().max(200),
  lat: z.number(),
  lng: z.number(),
  interests: z.array(CategoryEnum),
});

export const UpdateInterestsRequest = z.object({
  interests: z.array(CategoryEnum),
});

export const CreateBookingRequest = z.object({
  batch_id: z.string(),
  trial_at: z.string(), // S2.1: chosen class-session datetime (ISO)
});

export const RescheduleRequest = z.object({
  new_trial_at: z.string(),
});

export const CreateOrderRequest = z.object({
  booking_id: z.string(),
});

// S4.3: review from an attended trial OR an enrolment (one per user+academy).
// trial path: only trial_id needed (pins academy+batch). enrolment path: academy_id + batch_id.
export const CreateReviewRequest = z.object({
  source: z.enum(['trial', 'enrollment']),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  trial_id: z.string().optional(),
  academy_id: z.string().optional(),
  batch_id: z.string().optional(),
});

export const MarkAttendanceRequest = z.object({
  otp_code: z.string().length(6),
});

export const PushRegisterRequest = z.object({
  expo_token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

export type OtpRequestType = z.infer<typeof OtpRequest>;
export type OtpVerifyRequestType = z.infer<typeof OtpVerifyRequest>;
export type RefreshRequestType = z.infer<typeof RefreshRequest>;
export type LogoutRequestType = z.infer<typeof LogoutRequest>;
export type OnboardingRequestType = z.infer<typeof OnboardingRequest>;
export type UpdateInterestsRequestType = z.infer<typeof UpdateInterestsRequest>;
export type CreateBookingRequestType = z.infer<typeof CreateBookingRequest>;
export type RescheduleRequestType = z.infer<typeof RescheduleRequest>;
export type CreateOrderRequestType = z.infer<typeof CreateOrderRequest>;

export type PaymentBreakdown = {
  base_paise: number;
  total_paise: number;
};

export type CreateOrderResponse = {
  razorpay_order_id: string;
  razorpay_key: string;
  amount_paise: number;
  currency: string;
  breakdown: PaymentBreakdown;
};

export type CreateReviewRequestType = z.infer<typeof CreateReviewRequest>;
export type MarkAttendanceRequestType = z.infer<typeof MarkAttendanceRequest>;
export type PushRegisterRequestType = z.infer<typeof PushRegisterRequest>;

export type OAuthProvider = 'apple' | 'google';

export interface OAuthLoginRequest {
  idToken: string;
  nonce?: string;
  role: 'student' | 'academy';
}

export type AuthLoginResponse = {
  access_token: string;
  refresh_token: string;
  is_new_user: boolean;
  user?: Record<string, unknown>;
  account?: Record<string, unknown>;
  academy?: Record<string, unknown>;
  attendance_otp?: string;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  age?: number;
  location?: string;
  interests: Category[];
};

export type AcademyAccount = {
  id: string;
  phone: string | null;
  academyId: string | null;
  ownerName: string | null;
  email?: string | null;
};

export type Academy = {
  id: string;
  name: string;
  category: Category;
  address: string;
  bio?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  images?: string[];
};

export type Coach = {
  id: string;
  name: string;
  specialty: string;
  bio?: string;
  phone?: string;
};

export type Batch = {
  id: string;
  title: string;
  category: Category;
  level: string;
  /** Academy-authored "about this batch" copy. */
  description?: string | null;
  /** Academy-authored "things to know" bullet points. */
  things_to_know?: string[];
  coach_id: string;
  capacity: number;
  trial_fee_paise: number;
  monthly_fee_paise: number;
  // S1.3: academy-set discounts in bps, capped at 3000 (30%). Source of truth here;
  // consumed by enrol pricing in S2.3.
  quarterly_discount_bps?: number;
  annual_discount_bps?: number;
  // S3.4: number of classes per month (the explicit entitled count).
  sessions_per_month?: number;
  timings: BatchTiming[];
  // Batch discontinuation lifecycle: active → closing → ended (plan §7).
  status: 'active' | 'inactive' | 'closing' | 'ended';
  // S1.3: serialized as canonical `Mode` ('in-studio' | 'online'); DB stores online|offline,
  // mapped at the API boundary (lib/mode.ts).
  mode?: Mode;
  // S1.3: computed read-only trial spots = capacity − active enrollments.
  trial_spots?: number;
  coach_name?: string;
};

export type BatchTiming = {
  day_of_week: number;
  start_time: string;
  duration_min: number;
};

export const BatchTimingInput = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string(),
  duration_min: z.number().int().min(15).max(480),
});
export type BatchTimingInputType = z.infer<typeof BatchTimingInput>;

export type Slot = {
  id: string;
  batch_id: string;
  slot_time: string;
  capacity: number;
  reserved_count: number;
};

export type Trial = {
  id: string;
  batch_id: string;
  batch_title: string;
  student_id: string;
  student_name: string;
  status: 'booked' | 'attended' | 'missed' | 'cancelled';
  scheduled_at: string;
  coach_name?: string;
  mode?: Mode;
  source?: string;
  marked_at?: string;
};

export type TrialInboxItem = {
  id: string;
  student_name: string;
  student_age?: number;
  batch_title: string;
  scheduled_at: string;
  status: Trial['status'];
  student_phone?: string;
  level?: string;
  category?: Category;
  coach_name?: string;
  trial_fee_paise?: number;
};

export type Review = {
  id: string;
  student_name: string;
  rating: number;
  comment?: string;
  response?: string;
  created_at: string;
  responded_at?: string;
  batch_title?: string;
  session_count?: number;
  /** rating <= 3 and no response yet — surfaced as a flagged card */
  flagged?: boolean;
};

export type ReviewsSummary = {
  average: number;
  count: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  needs_reply: number;
};

export type StudentListItem = {
  id: string;
  name: string;
  phone?: string;
  age?: number;
  batches: { title: string; category: string }[];
  status: string;
};

export type StudentSnapshot = {
  id: string;
  name: string;
  phone: string;
  age?: number;
  location?: string;
};

export type Enrollment = {
  id: string;
  batch_id: string;
  batch_title: string;
  status: string;
};

// S3.1: a row in the student "Classes" tab (enrolled batch, never a trial).
export type ClassItem = {
  enrollment_id: string;
  batch_id: string;
  batch_title: string;
  category: string;
  level: string;
  monthly_fee_paise: number;
  status: 'active' | 'paused' | 'past';
  // Batch discontinuation lifecycle — 'closing' shows a notice banner + disables renew.
  batch_status?: 'active' | 'inactive' | 'closing' | 'ended';
  started_at: string;
  current_period_end?: string;
  paused_until?: string;
  attended_count: number;
  academy_id: string;
  academy_name: string;
  academy_address?: string;
  coach_name?: string;
  mode: Mode;
  timings: BatchTiming[];
};
export type MyClassesResponse = { active: ClassItem[]; past: ClassItem[] };

export type BatchAttendance = {
  date: string;
  present: boolean;
};

// S3.4: projected from BatchTiming (no slot_id); `cancelled` overlaid from CancelledSession.
export type ScheduleItem = {
  batch_id: string;
  session_date: string; // 'yyyy-MM-dd' (IST)
  batch_title: string;
  category: string;
  capacity: number;
  enrolled_count: number;
  coach_name: string | null;
  mode: Mode;
  start_time: string;
  end_time: string;
  status: 'now' | 'upcoming' | 'done' | 'cancelled';
};

export type NotificationChannelPrefs = { push: boolean; email: boolean; whatsapp: boolean };

export type Settings = {
  notifications: {
    new_trial: NotificationChannelPrefs;
    classes: { reminder_30min: boolean; attendance_reminder: boolean };
    reviews_activity: { new_review: boolean; leaderboard: boolean; reels: boolean };
    quiet_hours: { enabled: boolean; start: string; end: string };
  };
  privacy: {
    show_phone: boolean;
  };
  contact: { email?: string; whatsapp?: string };
};

export type WorkshopType = 'online' | 'offline';

export type Workshop = {
  id: string;
  academy_id: string;
  type: WorkshopType;
  title: string;
  description: string;
  start_at: string;
  duration_min: number;
  location?: string;
  capacity: number;
  registered_count: number;
  price_paise: number;
  status: 'draft' | 'upcoming' | 'completed' | 'cancelled';
  /** derived: start_at <= now <= start_at + duration_min */
  live?: boolean;
  created_at: string;
};

export const CreateWorkshopRequest = z.object({
  type: z.enum(['online', 'offline']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  start_at: z.string(),
  duration_min: z.number().int().min(15).max(480),
  location: z.string().max(300).optional(),
  capacity: z.number().int().min(1).max(1000),
  price_paise: z.number().int().min(0),
  status: z.enum(['draft', 'upcoming']).optional(),
});

// Academy-facing: one person who booked a workshop.
export type WorkshopRegistrant = {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  registered_at: string;
  payment_status: 'initiated' | 'pending' | 'captured' | 'failed' | 'refunded' | null;
  amount_paise: number;
  user: { id: string; name: string; phone: string | null; age: number | null };
};

export type WorkshopRegistrationsResponse = {
  workshop: { id: string; title: string; capacity: number; registered_count: number; price_paise: number };
  registrations: WorkshopRegistrant[];
};

export type CreateWorkshopRequestType = z.infer<typeof CreateWorkshopRequest>;

export const UpdateWorkshopRequest = CreateWorkshopRequest.partial();
export type UpdateWorkshopRequestType = z.infer<typeof UpdateWorkshopRequest>;

export class ApiError extends Error {
  code: string;
  fields?: Record<string, string>;

  constructor(code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.code = code;
    this.fields = fields;
    this.name = 'ApiError';
  }
}

export type ApiErrorType = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export type DashboardData = {
  inbox_counts: { new: number; pending: number; confirmed: number };
  active_trials: number;
  earnings_summary: { this_month_paise: number; last_month_paise: number };
  students_count: number;
  recent_reviews: Review[];
};

export type InboxResponse = {
  items: TrialInboxItem[];
  counts: { new: number; pending: number; confirmed: number };
  next_cursor: string | null;
};

export type EarningsPeriod = 'week' | 'month' | 'year';

export type EarningsTxn = {
  id: string;
  label: string;
  kind: string;
  dir: 'in' | 'out';
  amount_paise: number;
  commission_paise: number;
  net_paise: number;
  at: string;
};

export type EarningsData = {
  period: EarningsPeriod;
  total_paise: number; // back-compat = gross
  // S4.6: net of Findemy commission. gross − commission = net (events carry no commission).
  gross_paise: number;
  commission_paise: number;
  net_paise: number;
  /** total this period minus total previous period of same length */
  delta_paise: number;
  by_category: { category: string; captured_paise: number; commission_paise: number; net_paise: number; count: number }[];
  by_batch: { batch_id: string; batch_title: string; gross_paise: number; commission_paise: number; net_paise: number; count: number }[];
  transactions: EarningsTxn[];
  payouts: {
    id: string;
    amount_paise: number;
    status: string;
    paid_at?: string;
    bank_last4?: string;
    bank_name?: string;
  }[];
};

export type ActivityItem = {
  id: string;
  kind: 'trial_done' | 'review' | 'enrollment' | 'workshop_reg';
  icon_tone: 'jade' | 'marigold' | 'persimmon' | 'rose';
  title: string;
  subtitle?: string;
  at: string;
  action?: { label: string; route: string };
};

export type TrialDetail = Trial & {
  note?: string;
  payment_method?: string;
  distance_km?: number;
  batch_level?: string;
  category?: Category;
  slot_time?: string;
  trial_fee_paise?: number;
};
