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
  const levels = Array.from(new Set(batches.map((b) => b.level).filter((l): l is string => !!l)));
  if (levels.length === 1) return levels[0];
  if (levels.length > 1) return "All levels";
  return "";
}

// Turn a server program (from GET /academies/:id → programs[] or GET /programs/:id) into the
// client Program shape used across the app.
export function enrichProgram(sp: any): Program {
  const batches: ProgramBatch[] = (sp?.batches ?? []) as ProgramBatch[];
  const level = deriveLevel(batches);
  return {
    id: sp.id,
    academy_id: sp.academy_id,
    title: sp.title,
    category: sp.category,
    level,
    description: (sp.description ?? "") as string,
    things_to_know: sp.things_to_know ?? [],
    image_url: getProgramImage(sp.category, level || batches[0]?.level || ""),
    media: (sp.media ?? []) as ProgramMedia[],
    coach_names: sp.coach_names ?? [],
    trial_fee_paise: sp.trial_fee_paise ?? 0,
    monthly_fee_paise_from: sp.monthly_fee_paise_from ?? 0,
    total_seats_left: sp.total_seats_left ?? 0,
    batches,
  };
}
