import { getProgramImage } from "./programImages";

// Programs are now server-provided (a real entity — see
// ai-usage/final-app/plan/programs-and-batch-discontinuation.md). The client no longer groups
// batches by (category, level); it just enriches the server program with a category-derived
// image (fallback) and a display `level` derived from the program's batches. Canned text copy
// was dropped — the academy authors the real title/description.

export type ProgramBatch = {
  id: string;
  academy_id?: string;
  program_id?: string;
  coach_id?: string;
  coach_name?: string | null;
  title?: string;
  category?: string;
  level?: string;
  description?: string | null;
  things_to_know?: string[];
  capacity?: number;
  enrolled_count?: number;
  trial_spots?: number;
  trial_fee_paise?: number;
  monthly_fee_paise?: number;
  quarterly_discount_bps?: number;
  annual_discount_bps?: number;
  sessions_per_month?: number;
  status?: string;
  mode?: string;
  timings?: any[];
  created_at?: string;
};

export type Coach = {
  id: string;
  name?: string;
  specialty?: string;
};

export type ProgramMedia = { url: string; type: "photo" | "video" };

export type Program = {
  id: string;
  academy_id: string;
  title: string;
  category: string;
  level: string; // derived client-side from the program's batches
  description: string;
  things_to_know: string[];
  image_url: string; // derived client-side from category (fallback imagery)
  media: ProgramMedia[]; // academy-uploaded photos/videos (may be empty)
  coach_names: string[];
  trial_fee_paise: number;
  monthly_fee_paise_from: number;
  total_seats_left: number;
  batches: ProgramBatch[];
};

// A batch-level summary shown where the program used to carry a single level.
function deriveLevel(batches: ProgramBatch[]): string {
  const levels = Array.from(new Set(batches.map((batch) => batch.level).filter((level): level is string => !!level)));
  if (levels.length === 1) return levels[0];
  if (levels.length > 1) return "All levels";
  return "";
}

// Turn a server program (from GET /academies/:id → programs[] or GET /programs/:id) into the
// client Program shape used across the app.
export function enrichProgram(serverProgram: any): Program {
  const batches: ProgramBatch[] = (serverProgram?.batches ?? []) as ProgramBatch[];
  const level = deriveLevel(batches);
  return {
    id: serverProgram.id,
    academy_id: serverProgram.academy_id,
    title: serverProgram.title,
    category: serverProgram.category,
    level,
    description: (serverProgram.description ?? "") as string,
    things_to_know: serverProgram.things_to_know ?? [],
    image_url: getProgramImage(serverProgram.category, level || batches[0]?.level || ""),
    media: (serverProgram.media ?? []) as ProgramMedia[],
    coach_names: serverProgram.coach_names ?? [],
    trial_fee_paise: serverProgram.trial_fee_paise ?? 0,
    monthly_fee_paise_from: serverProgram.monthly_fee_paise_from ?? 0,
    total_seats_left: serverProgram.total_seats_left ?? 0,
    batches,
  };
}
