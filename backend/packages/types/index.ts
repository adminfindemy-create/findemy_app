/**
 * Shim types for the backend API.
 *
 * The upstream `@findemy/types` package was symlinked into
 * `backend/api/node_modules/@findemy/types` -> `../../../packages/types`, but
 * `packages/types` was never checked into this monorepo. Rather than change
 * the ~20 backend imports, we drop a minimal Zod-schema shim here that
 * exports exactly the names the backend routes consume.
 *
 * Schemas are derived from the field shapes hand-typed in each route
 * (student.routes.ts, academy.routes.ts, batch.routes.ts, etc.). Keep in
 * sync with those handlers if you touch the request bodies there.
 */
import { z } from 'zod';

// --- auth (shared) ---------------------------------------------------------

const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Phone must be at least 10 digits')
  .max(20)
  .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number');

const otpCodeSchema = z
  .string()
  .trim()
  .length(6, 'OTP must be 6 digits')
  .regex(/^[0-9]{6}$/, 'OTP must be numeric');

export const SendOtpInput = z.object({
  phone: phoneSchema,
});
export type SendOtpInputType = z.infer<typeof SendOtpInput>;

export const VerifyOtpStudentInput = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  name: z.string().trim().min(1).max(100).optional(),
});
export type VerifyOtpStudentInputType = z.infer<typeof VerifyOtpStudentInput>;

export const VerifyOtpAcademyInput = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  ownerName: z.string().trim().min(1).max(100).optional(),
});
export type VerifyOtpAcademyInputType = z.infer<typeof VerifyOtpAcademyInput>;

export const RefreshInput = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInputType = z.infer<typeof RefreshInput>;

// --- academy studio profile ------------------------------------------------

export const AcademyUpdateInput = z
  .object({
    description: z.string().max(2000).optional(),
    category: z.array(z.string()).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    pincode: z
      .string()
      .regex(/^[0-9]{4,10}$/, 'Enter a valid pincode')
      .optional(),
    bannerUrl: z.string().url().optional(),
    lat: z.number().finite().optional(),
    lng: z.number().finite().optional(),
  })
  .strict();
export type AcademyUpdateInputType = z.infer<typeof AcademyUpdateInput>;

// --- instructors -----------------------------------------------------------

export const InstructorCreateInput = z.object({
  name: z.string().trim().min(1).max(100),
  bio: z.string().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
  specialization: z.string().max(200).optional(),
});
export type InstructorCreateInputType = z.infer<typeof InstructorCreateInput>;

export const InstructorUpdateInput = InstructorCreateInput.partial();
export type InstructorUpdateInputType = z.infer<typeof InstructorUpdateInput>;

// --- batches ---------------------------------------------------------------

const LevelEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
const ModeEnum = z.enum(['ONLINE', 'OFFLINE']);

export const BatchCreateInput = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  level: LevelEnum,
  mode: ModeEnum,
  timing: z.string().trim().min(1).max(200),
  capacity: z.number().int().min(1).max(1000),
  trialFee: z.number().int().min(0),
  monthlyFee: z.number().int().min(0),
  instructorId: z.string().uuid().optional(),
});
export type BatchCreateInputType = z.infer<typeof BatchCreateInput>;

export const BatchUpdateInput = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    level: LevelEnum.optional(),
    mode: ModeEnum.optional(),
    timing: z.string().trim().min(1).max(200).optional(),
    capacity: z.number().int().min(1).max(1000).optional(),
    trialFee: z.number().int().min(0).optional(),
    monthlyFee: z.number().int().min(0).optional(),
    instructorId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export type BatchUpdateInputType = z.infer<typeof BatchUpdateInput>;
