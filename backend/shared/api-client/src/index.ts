import { ApiError } from "@findemy/types";
import type {
  OtpRequestType,
  OtpVerifyRequestType,
  RefreshRequestType,
  LogoutRequestType,
  OnboardingRequestType,
  UpdateInterestsRequestType,
  CreateBookingRequestType,
  CreateOrderRequestType,
  CreateOrderResponse,
  CreateReviewRequestType,
  PushRegisterRequestType,
  CreateWorkshopRequestType,
  UpdateWorkshopRequestType,
  Workshop,
  WorkshopRegistrationsResponse,
  OAuthLoginRequest,
  AuthLoginResponse,
  DashboardData,
  InboxResponse,
  StudentSnapshot,
  StudentListItem,
  ScheduleItem,
  Batch,
  Mode,
  ClassItem,
  Review,
  ReviewsSummary,
  EarningsData,
  EarningsPeriod,
  Settings,
  ActivityItem,
  TrialDetail,
  UpcomingSessionsResponse,
  CoachBooking,
  NotificationListResponse,
} from "@findemy/types";

export type ClientConfig = {
  baseUrl: string;
  getAccessToken: () => string | null;
  onUnauthorized: () => Promise<string | null>;
};

function stripUndefined(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) out[key] = String(value);
  }
  return out;
}

export function createClient(config: ClientConfig) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    retry = true
  ): Promise<T> {
    const url = `${config.baseUrl}${path}`;
    const headers: Record<string, string> = {};
    const token = config.getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401 && retry) {
      const newToken = await config.onUnauthorized();
      if (newToken) {
        return request<T>(method, path, body, false);
      }
    }

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = data?.error;
      throw new ApiError(err?.code ?? "INTERNAL", err?.message ?? "Request failed", err?.fields);
    }
    return data as T;
  }

  return {
    auth: {
      requestOtp: (payload: OtpRequestType) =>
        request<{ otp_id: string; expires_at: string; channel: string }>(
          "POST", "/auth/otp/request", payload, false
        ),
      verifyOtp: (payload: OtpVerifyRequestType) =>
        request<{
          access_token: string;
          refresh_token: string;
          is_new_user: boolean;
          user?: Record<string, unknown>;
          attendance_otp?: string;
        }>("POST", "/auth/otp/verify", payload, false),
      refresh: (payload: RefreshRequestType) =>
        request<{ access_token: string; refresh_token: string }>(
          "POST", "/auth/refresh", payload, false
        ),
      logout: (payload: LogoutRequestType) => request<{}>("POST", "/auth/logout", payload, false),
      oauthApple: (payload: OAuthLoginRequest) =>
        request<AuthLoginResponse>("POST", "/auth/oauth/apple", payload, false),
      oauthGoogle: (payload: OAuthLoginRequest) =>
        request<AuthLoginResponse>("POST", "/auth/oauth/google", payload, false),
    },
    me: {
      get: () => request<{ user: Record<string, unknown>; attendance_otp: string }>("GET", "/me"),
      getStats: () => request<{ trials_count: number; enrolled_count: number; reviews_count: number }>("GET", "/me/stats"),
      // S3.1: Classes tab — enrolled batches only (active + past), no trials.
      getClasses: () => request<{ active: ClassItem[]; past: ClassItem[] }>("GET", "/me/classes"),
      updateOnboarding: (payload: OnboardingRequestType) =>
        request<{ user: Record<string, unknown> }>("PUT", "/me/onboarding", payload),
      updateInterests: (payload: UpdateInterestsRequestType) =>
        request<{ user: Record<string, unknown> }>("PUT", "/me/interests", payload),
      getEnrollments: () =>
        request<{
          items: Array<{
            id: string;
            batch_id: string;
            batch_title: string;
            category: string;
            level: string;
            monthly_fee_paise: number;
            status: string;
            started_at: string;
            attended_count: number;
            academy_id: string;
            academy_name: string;
            academy_address?: string;
            coach_name?: string;
            mode?: string;
            timings: Array<{ day_of_week: number; start_time: string; duration_min: number }>;
            paused_until?: string | null;
            discontinue_requested_at?: string | null;
            current_period_end?: string | null;
            default_package?: string | null;
          }>;
        }>("GET", "/me/enrollments"),
      savedAcademies: {
        toggle: (academyId: string) =>
          request<{ saved: boolean }>("POST", `/me/saved-academies/${academyId}`),
        list: () =>
          request<{ items: Record<string, unknown>[] }>("GET", "/me/saved-academies"),
      },
      getMyReviews: () =>
        request<{ items: Array<{ id: string; rating: number; comment: string | null; created_at: string; academy_name: string; academy_id: string; batch_title: string }> }>(
          "GET", "/me/reviews"
        ),
      getWorkshopRegistrations: () =>
        request<{ items: Array<{ id: string; status: string; workshop_id: string; workshop_title: string; workshop_type: string; start_at: string; price_paise: number; academy_name: string; academy_id: string }> }>(
          "GET", "/me/workshop-registrations"
        ),
      getEventRegistrations: () =>
        request<{ items: Array<{ id: string; status: string; event_id: string; event_title: string; event_type: string; category: string; start_at: string; location: string; price_paise: number; organizer_name: string }> }>(
          "GET", "/me/event-registrations"
        ),
      getPayments: () =>
        request<{
          items: Array<{
            id: string;
            enrollment_id: string;
            batch_title: string;
            academy_id: string;
            academy_name: string;
            package_type: string;
            amount_paise: number;
            currency: string;
            status: string;
            paid_at: string;
            refund_status: string | null;
            refund_amount_paise: number | null;
          }>;
        }>("GET", "/me/payments"),
      getPaymentReceipt: (params: { id: string }) =>
        request<{
          receipt: {
            payment_id: string;
            receipt_number: string;
            paid_at: string;
            amount_paise: number;
            currency: string;
            package_type: string;
            period_start: string;
            period_end: string;
            batch_title: string;
            academy_name: string;
            academy_address: string;
            student_name: string | null;
            razorpay_payment_id: string | null;
          };
        }>("GET", `/me/payments/${params.id}/receipt`),
      getDues: () =>
        request<{
          items: Array<{
            id: string;
            enrollment_id: string;
            batch_title: string;
            academy_id: string;
            academy_name: string;
            package_type: string;
            amount_paise: number;
            status: string;
            due_date: string;
            grace_period_end: string | null;
          }>;
        }>("GET", "/me/dues"),
      referral: {
        get: () =>
          request<{ code: string; points: number }>("GET", "/me/referral"),
        claim: (code: string) =>
          request<{ success: boolean; points_earned: number }>("POST", "/me/referral/claim", { code }),
        history: () =>
          request<{ points: number; history: Record<string, unknown>[] }>("GET", "/me/referral/history"),
      },
    },
    academies: {
      list: (query?: Record<string, unknown>) => {
        const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
        return request<{
          items: Record<string, unknown>[];
          next_cursor: string | null;
        }>("GET", `/academies${qs}`);
      },
      getById: (params: { id: string }) =>
        request<{
          academy: Record<string, unknown>;
          coaches: Record<string, unknown>[];
          batches: Record<string, unknown>[];
          programs: Record<string, unknown>[];
          reviews: Record<string, unknown>[];
        }>("GET", `/academies/${params.id}`),
      getReviews: (params: { id: string; query?: Record<string, unknown> }) => {
        const qs = params.query
          ? "?" + new URLSearchParams(stripUndefined(params.query) as any).toString()
          : "";
        return request<{
          items: Record<string, unknown>[];
          next_cursor: string | null;
        }>("GET", `/academies/${params.id}/reviews${qs}`);
      },
      getWorkshops: (params: { id: string }) =>
        request<{ items: Workshop[] }>("GET", `/academies/${params.id}/workshops`),
    },
    programs: {
      // A program (named offering) with its nested batches + a small academy summary.
      getById: (params: { id: string }) =>
        request<{
          program: Record<string, unknown>;
          academy: Record<string, unknown>;
        }>("GET", `/programs/${params.id}`),
    },
    batches: {
      // S2.1: trial availability = upcoming class sessions where capacity − enrolled > 0.
      getTrialAvailability: (params: { id: string }) =>
        request<{ capacity: number; enrolled: number; available: number; accepting: boolean; times: string[] }>(
          "GET",
          `/batches/${params.id}/trial-availability`
        ),
      enroll: (batchId: string, payload: { package_type: string }) =>
        request<{
          enrollment_id: string;
          enrollment_period_id: string;
          requires_payment: boolean;
          amount_paise: number;
          razorpay_order_id: string;
          razorpay_key: string;
          currency: string;
        }>("POST", `/batches/${batchId}/enroll`, payload),
      unenroll: (batchId: string) =>
        request<{ enrolled: boolean }>("DELETE", `/batches/${batchId}/enroll`, {}),
      enrollmentStatus: (batchId: string) =>
        request<{ enrolled: boolean }>("GET", `/batches/${batchId}/enrollment`),
      getRenewalOptions: (batchId: string) =>
        request<{
          options: Array<{
            package_type: string;
            months: number;
            amount_paise: number;
            discount_bps: number;
          }>;
        }>("GET", `/batches/${batchId}/renewal-options`),
      renew: (batchId: string, payload: { package_type: string }) =>
        request<{
          enrollment_id: string;
          enrollment_period_id: string;
          requires_payment: boolean;
          amount_paise: number;
          razorpay_order_id: string;
          razorpay_key: string;
          currency: string;
        }>("POST", `/batches/${batchId}/renew`, payload),
      getAvailability: (batchId: string) =>
        request<{
          capacity: number;
          enrolled: number;
          available: number;
          accepting: boolean;
        }>("GET", `/batches/${batchId}/availability`),
    },
    // M2.1: student "Pending Classes" feed — next concrete upcoming sessions per
    // enrolled+active batch.
    sessions: {
      upcoming: () =>
        request<UpcomingSessionsResponse>("GET", "/me/sessions/upcoming"),
    },
    enrollments: {
      get: (id: string) =>
        request<{ enrollment: Record<string, unknown> }>("GET", `/enrollments/${id}`),
      discontinue: (id: string, payload: { immediate: boolean; reason: string }) =>
        request<{ scheduled_end?: string; refund_initiated?: boolean }>(
          "POST", `/enrollments/${id}/discontinue`, payload
        ),
      cancelDiscontinue: (id: string) =>
        request<{}>("POST", `/enrollments/${id}/cancel-discontinue`),
      pause: (id: string, payload: { duration: string; reason?: string }) =>
        request<{
          pause_id: string;
          status: string;
          start_date?: string;
          end_date?: string;
        }>("POST", `/enrollments/${id}/pause`, payload),
      resumePause: (enrollmentId: string, pauseId: string) =>
        request<{}>("POST", `/enrollments/${enrollmentId}/pauses/${pauseId}/resume`),
      transfer: (id: string, payload: { target_batch_id: string; reason?: string }) =>
        request<{ transfer_request_id: string; status: string }>(
          "POST", `/enrollments/${id}/transfer`, payload
        ),
      setPreferredPackage: (id: string, payload: { package_type: string }) =>
        request<{}>("POST", `/enrollments/${id}/preferred-package`, payload),
    },
    bookings: {
      create: (payload: CreateBookingRequestType) =>
        request<{ booking: Record<string, unknown>; payment_intent: Record<string, unknown> }>(
          "POST",
          "/bookings",
          payload
        ),
      get: (params: { id: string }) =>
        request<{ booking: Record<string, unknown> }>("GET", `/bookings/${params.id}`),
      cancel: (params: { id: string; acknowledge_no_refund?: boolean; reason?: string }) =>
        request<{
          booking: Record<string, unknown>;
          refund_eligible: boolean;
          refund_initiated: boolean;
          refund_amount_paise: number;
        }>("POST", `/bookings/${params.id}/cancel`, {
          acknowledge_no_refund: params.acknowledge_no_refund,
          reason: params.reason,
        }),
      reschedule: (params: { id: string; new_trial_at: string }) =>
        request<{ booking: Record<string, unknown> }>(
          "POST",
          `/bookings/${params.id}/reschedule`,
          { new_trial_at: params.new_trial_at }
        ),
    },
    payments: {
      createOrder: (payload: CreateOrderRequestType) =>
        request<CreateOrderResponse>("POST", "/payments/order", payload),
      get: (params: { id: string }) =>
        request<{ payment: Record<string, unknown> }>("GET", `/payments/${params.id}`),
      createWorkshopOrder: (registration_id: string) =>
        request<{ razorpay_order_id: string; razorpay_key: string; amount_paise: number; currency: string }>(
          "POST", "/payments/workshop-order", { registration_id }
        ),
      createEnrollmentOrder: (enrollment_period_id: string) =>
        request<{ razorpay_order_id: string; razorpay_key: string; amount_paise: number; currency: string }>(
          "POST", "/payments/enrollment-order", { enrollment_period_id }
        ),
      createEventOrder: (registration_id: string) =>
        request<{ razorpay_order_id: string; razorpay_key: string; amount_paise: number; currency: string }>(
          "POST", "/payments/event-order", { registration_id }
        ),
    },
    // M4.1a: 1:1 tutor booking — request/accept/reject + payment-on-accept.
    // Check-in/check-out/refunds are a later slice, added to this same namespace.
    coaching: {
      createRequest: (payload: { coach_id: string; mode: "online" | "offline"; proposed_at: string; duration_min: number }) =>
        request<{ booking: CoachBooking }>("POST", "/coaching/requests", payload),
      myRequests: () => request<{ items: CoachBooking[] }>("GET", "/coaching/requests/mine"),
      get: (params: { id: string }) =>
        request<{ booking: CoachBooking }>("GET", `/coaching/requests/${params.id}`),
      accept: (params: { id: string; amount_paise: number }) =>
        request<{
          booking_id: string;
          status: "accepted";
          requires_payment: true;
          razorpay_order_id: string;
          razorpay_key: string;
          amount_paise: number;
          currency: string;
        }>("POST", `/studio/coaching/requests/${params.id}/accept`, { amount_paise: params.amount_paise }),
      reject: (params: { id: string; reason?: string }) =>
        request<{ booking_id: string; status: "rejected" }>(
          "POST", `/studio/coaching/requests/${params.id}/reject`, { reason: params.reason }
        ),
    },
    trials: {
      my: (query?: { status?: "upcoming" | "past" }) => {
        const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
        return request<{ items: Record<string, unknown>[] }>("GET", `/trials/my${qs}`);
      },
      today: () => request<{ items: Record<string, unknown>[] }>("GET", "/trials/today"),
      get: (params: { id: string }) =>
        request<{ trial: Record<string, unknown> }>("GET", `/trials/${params.id}`),
    },
    // S3.2: student scans an in-studio QR → mark present.
    attendance: {
      checkin: (token: string) =>
        request<{ present: boolean; batch_title: string }>("POST", "/attendance/checkin", { token }),
    },
    reviews: {
      create: (payload: CreateReviewRequestType) =>
        request<{ review: Record<string, unknown> }>("POST", "/reviews", payload),
    },
    events: {
      list: (query?: { type?: string; cursor?: string; limit?: number }) => {
        const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
        return request<{
          items: Record<string, unknown>[];
          next_cursor: string | null;
        }>("GET", `/events${qs}`);
      },
      get: (params: { id: string }) =>
        request<{ event: Record<string, unknown> }>("GET", `/events/${params.id}`),
      getRegistration: (eventId: string) =>
        request<{ registered: boolean; status: string | null; registration_id: string | null }>(
          "GET", `/events/${eventId}/registration`
        ),
      register: (eventId: string) =>
        request<{ registration_id: string; requires_payment: boolean; amount_paise: number }>(
          "POST", `/events/${eventId}/register`, {}
        ),
      cancelRegistration: (registrationId: string) =>
        request<{ refund_initiated?: boolean }>(
          "POST", `/events/registrations/${registrationId}/cancel`
        ),
    },
    workshops: {
      listAll: () =>
        request<{ items: (Workshop & { academy_name: string })[] }>("GET", "/workshops"),
      get: (id: string) =>
        request<{ workshop: any }>("GET", `/workshops/${id}`),
      register: (id: string) =>
        request<{ registration_id: string; requires_payment: boolean; amount_paise: number }>(
          "POST", `/workshops/${id}/register`, {}
        ),
      registrationStatus: (id: string) =>
        request<{ registered: boolean; status: string | null; registration_id?: string | null }>(
          "GET", `/workshops/${id}/registration`
        ),
      cancelRegistration: (
        registrationId: string,
        opts?: { acknowledge_no_refund?: boolean; reason?: string },
      ) =>
        request<{
          cancelled: boolean;
          refund_eligible: boolean;
          refund_initiated: boolean;
          refund_amount_paise: number;
        }>(
          "POST",
          `/workshops/registrations/${registrationId}/cancel`,
          {
            acknowledge_no_refund: opts?.acknowledge_no_refund,
            reason: opts?.reason,
          }
        ),
    },
    notes: {
      // M2.2: class notes — batch/subject-scoped (see backend/api/src/modules/notes).
      listByBatch: (batchId: string) =>
        request<{
          items: {
            id: string;
            batch_id: string;
            title: string;
            body?: string;
            attachment_url?: string;
            attachment_type?: "photo" | "video";
            attachment_name?: string;
            created_at: string;
            updated_at: string;
          }[];
        }>("GET", `/notes?batch_id=${encodeURIComponent(batchId)}`),
      create: (payload: {
        batch_id: string;
        title: string;
        body?: string;
        attachment_url?: string;
        attachment_type?: "photo" | "video";
        attachment_name?: string;
      }) =>
        request<{
          note: {
            id: string;
            batch_id: string;
            title: string;
            body?: string;
            attachment_url?: string;
            attachment_type?: "photo" | "video";
            attachment_name?: string;
            created_at: string;
            updated_at: string;
          };
        }>("POST", "/notes", payload),
      update: (
        id: string,
        payload: Partial<{
          title: string;
          body: string | null;
          attachment_url: string | null;
          attachment_type: "photo" | "video" | null;
          attachment_name: string | null;
        }>
      ) =>
        request<{
          note: {
            id: string;
            batch_id: string;
            title: string;
            body?: string;
            attachment_url?: string;
            attachment_type?: "photo" | "video";
            attachment_name?: string;
            created_at: string;
            updated_at: string;
          };
        }>("PUT", `/notes/${id}`, payload),
      remove: (id: string) =>
        request<{ deleted: boolean }>("DELETE", `/notes/${id}`),
    },
    push: {
      register: (payload: PushRegisterRequestType) =>
        request<{ ok: boolean }>("POST", "/push/register", payload),
      unregister: (token: string) =>
        request<{ ok: boolean }>("DELETE", `/push/register?token=${encodeURIComponent(token)}`),
    },
    notifications: {
      list: () => request<NotificationListResponse>("GET", "/notifications"),
      markRead: (id: string) =>
        request<{ ok: boolean }>("POST", `/notifications/${id}/read`),
      markAllRead: () =>
        request<{ ok: boolean }>("POST", "/notifications/read-all"),
    },
    academy: {
      completeOnboarding: (payload: {
        ownerName?: string;
        academyName: string;
        city: string;
        category: "music" | "dance" | "arts" | "yoga";
        phone?: string;
        modesOffered?: ("in_studio" | "online" | "home_visit")[];
        tagline?: string;
      }) =>
        request<{
          account: Record<string, unknown>;
          academy: Record<string, unknown>;
        }>("POST", "/academy/onboarding", payload),
    },
    studio: {
      dashboard: () =>
        request<DashboardData>("GET", "/studio/dashboard"),
      inbox: {
        list: (query?: Record<string, unknown>) => {
          const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
          return request<InboxResponse>("GET", `/studio/inbox${qs}`);
        },
      },
      trials: {
        get: (id: string) =>
          request<{ trial: TrialDetail; student: StudentSnapshot }>("GET", `/studio/trials/${id}`),
        markAttendance: ({ id, otp_code }: { id: string; otp_code: string }) =>
          request<Record<string, unknown>>("POST", `/studio/trials/${id}/attendance`, { otp_code }),
        markNoShow: (id: string) =>
          request<Record<string, unknown>>("POST", `/studio/trials/${id}/no-show`, {}),
      },
      activity: {
        list: () => request<{ items: ActivityItem[] }>("GET", "/studio/activity"),
      },
      schedule: {
        get: (query?: Record<string, unknown>) => {
          const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
          return request<{ days: { date: string; items: ScheduleItem[] }[] }>("GET", `/studio/schedule${qs}`);
        },
      },
      // S3.4: cancel a class session → unbilled + make-good (replaces slots.delete).
      sessions: {
        cancel: (body: { batch_id: string; session_date: string }) =>
          request<{ cancelled: boolean; affected_count: number; already_cancelled?: boolean }>("POST", "/studio/sessions/cancel", body),
      },
      slots: {
        publish: (body: Record<string, unknown>) =>
          request<Record<string, unknown>>("POST", "/studio/slots/publish", body),
        delete: (id: string) =>
          request<{}>("DELETE", `/studio/slots/${id}`),
        reschedule: (id: string, body: { slot_time: string }) =>
          request<{}>("PUT", `/studio/slots/${id}`, body),
      },
      programs: {
        list: () =>
          request<{ items: Record<string, unknown>[] }>("GET", "/studio/programs"),
        get: (id: string) =>
          request<{ program: Record<string, unknown>; batches: Record<string, unknown>[] }>(
            "GET",
            `/studio/programs/${id}`
          ),
        create: (body: { title: string; category: string; description: string; things_to_know?: string[]; media: { url: string; type: string }[] }) =>
          request<{ program: { id: string } }>("POST", "/studio/programs", body),
        update: (id: string, body: Record<string, unknown>) =>
          request<{ program: { id: string } }>("PUT", `/studio/programs/${id}`, body),
        delete: (id: string) =>
          request<{}>("DELETE", `/studio/programs/${id}`),
      },
      batches: {
        list: () =>
          request<{ items: Batch[] }>("GET", "/studio/batches"),
        get: (id: string) =>
          request<{ batch: Batch }>("GET", `/studio/batches/${id}`),
        // S1.3: canonical Mode wire vocabulary; quarterly/annual discount bps (≤3000) pass through.
        create: (body: Record<string, unknown> & { mode?: Mode; quarterly_discount_bps?: number; annual_discount_bps?: number }) =>
          request<Record<string, unknown>>("POST", "/studio/batches", body),
        update: (id: string, body: Record<string, unknown> & { mode?: Mode; quarterly_discount_bps?: number; annual_discount_bps?: number }) =>
          request<Record<string, unknown>>("PUT", `/studio/batches/${id}`, body),
        delete: (id: string) =>
          request<{}>("DELETE", `/studio/batches/${id}`),
        // Batch discontinuation lifecycle (active → closing → ended).
        discontinue: (id: string) =>
          request<{ status: string; cancelled_trials: number; notified: number }>("POST", `/studio/batches/${id}/discontinue`),
        discontinuation: (id: string) =>
          request<{
            batch_id: string;
            batch_title: string;
            status: string;
            discontinue_requested_at: string | null;
            notice_days_remaining: number;
            active_enrollments: number;
            blockers: { enrollment_id: string; user_id: string; student_name: string | null; paid_through: string; package_type: string; amount_paise: number }[];
            can_finish: boolean;
          }>("GET", `/studio/batches/${id}/discontinuation`),
        refundDiscontinuation: (id: string, enrollmentId: string) =>
          request<{ refunded: boolean; refund_amount_paise: number; razorpay_refund_id: string | null }>(
            "POST",
            `/studio/batches/${id}/discontinuation/refund`,
            { enrollment_id: enrollmentId }
          ),
        finishDiscontinuation: (id: string) =>
          request<{ status: string }>("POST", `/studio/batches/${id}/finish-discontinuation`),
        students: (batchId: string) =>
          request<{ students: { id: string; name: string; phone: string; age: number | null; attendance_pct: number | null; tier: 'active' | 'irregular' | 'inactive' | null; last_seen: string | null }[] }>(
            "GET",
            `/studio/batches/${batchId}/students`
          ),
        // S3.2: in-studio attendance is QR-only (manual mark removed).
        attendance: {
          // live "N of M checked in" roster (scanned / not-yet).
          sessionAttendance: (batchId: string, date?: string) => {
            const qs = date ? `?date=${date}` : "";
            return request<{ present_count: number; total: number; roster: { user_id: string; name: string; checked_in: boolean; marked_at?: string }[] }>("GET", `/studio/batches/${batchId}/session/attendance${qs}`);
          },
          // issue today's QR check-in token for an in-studio session.
          checkinToken: (batchId: string) =>
            request<{ token: string; session_date: string }>("POST", `/studio/batches/${batchId}/session/checkin-token`),
        },
        slots: (batchId: string, query?: Record<string, unknown>) => {
          const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
          return request<{ slots: unknown[] }>("GET", `/studio/batches/${batchId}/slots${qs}`);
        },
      },
      students: {
        list: (query?: Record<string, unknown>) => {
          const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
          return request<{ items: StudentListItem[]; next_cursor: string | null }>("GET", `/studio/students${qs}`);
        },
        get: (id: string) =>
          request<{ student: StudentSnapshot; enrollments: unknown[]; trial_history: unknown[]; attendance_history: unknown[] }>("GET", `/studio/students/${id}`),
      },
      reviews: {
        list: (query?: { filter?: 'all' | 'needs_reply' | 'replied' | '5' | 'lte3'; cursor?: string }) => {
          const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
          return request<{ items: Review[]; summary?: ReviewsSummary; next_cursor: string | null }>("GET", `/studio/reviews${qs}`);
        },
        summary: () => request<ReviewsSummary>("GET", "/studio/reviews/summary"),
        respond: ({ id, response }: { id: string; response: string }) =>
          request<Record<string, unknown>>("POST", `/studio/reviews/${id}/respond`, { response }),
      },
      earnings: {
        get: (query?: { period?: EarningsPeriod; from?: string; to?: string; category?: 'trial' | 'enrollment' | 'workshop' }) => {
          const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
          return request<EarningsData>("GET", `/studio/earnings${qs}`);
        },
      },
      settings: {
        get: () =>
          request<{ settings: Settings }>("GET", "/studio/settings"),
        update: (body: Partial<Settings>) =>
          request<{ settings: Settings }>("PUT", "/studio/settings", body),
      },
      academy: {
        get: () =>
          request<Record<string, unknown>>("GET", "/studio/academy"),
        update: (body: Record<string, unknown>) =>
          request<Record<string, unknown>>("PUT", "/studio/academy", body),
      },
      workshops: {
        list: () =>
          request<{ items: Workshop[] }>("GET", "/studio/workshops"),
        create: (body: CreateWorkshopRequestType) =>
          request<{ workshop: Workshop }>("POST", "/studio/workshops", body),
        update: (id: string, body: UpdateWorkshopRequestType) =>
          request<{ workshop: Workshop }>("PUT", `/studio/workshops/${id}`, body),
        delete: (id: string) =>
          request<{}>("DELETE", `/studio/workshops/${id}`),
        registrations: (id: string) =>
          request<WorkshopRegistrationsResponse>("GET", `/studio/workshops/${id}/registrations`),
      },
      coaches: {
        list: () =>
          request<{ items: { id: string; name: string; specialty: string; bio: string | null; phone: string | null; avatar_url: string | null; batch_count: number }[] }>("GET", "/studio/coaches"),
        // S4.2: coach detail + assigned batches.
        get: (id: string) =>
          request<{ coach: { id: string; name: string; specialty: string; bio: string | null; phone: string | null; avatar_url: string | null; batch_count: number; batches: { id: string; title: string }[] } }>("GET", `/studio/coaches/${id}`),
        create: (body: { name: string; specialty: string; bio?: string; phone?: string; avatar_url?: string | null }) =>
          request<{ coach: { id: string } }>("POST", "/studio/coaches", body),
        update: (id: string, body: { name?: string; specialty?: string; bio?: string; phone?: string; avatar_url?: string | null }) =>
          request<{ coach: { id: string } }>("PUT", `/studio/coaches/${id}`, body),
        delete: (id: string) =>
          request<{}>("DELETE", `/studio/coaches/${id}`),
      },
    },
    rooms: {
      getBatchToken: (batchId: string) =>
        request<{ token: string; room_id: string; room_name: string }>(
          "GET", `/rooms/batch/${batchId}/token`
        ),
      getWorkshopToken: (workshopId: string) =>
        request<{ token: string; room_id: string; room_name: string }>(
          "GET", `/rooms/workshop/${workshopId}/token`
        ),
      // S3.3: academy "Start live class" → host token for the batch's 100ms room.
      startLive: (batchId: string) =>
        request<{ token: string; room_id: string; room_name: string }>(
          "POST", `/studio/batches/${batchId}/live/start`
        ),
    },
  };
}

export type ApiClient = ReturnType<typeof createClient>;
export { ApiError } from "@findemy/types";
