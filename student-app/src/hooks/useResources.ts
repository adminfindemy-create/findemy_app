import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

// M5.2: study material / resources — batch-scoped, read-only for students.
// Mirrors useNotes.ts's `useNotesForBatch` pattern (see that file for why the
// upload endpoint isn't routed through `@findemy/api-client`'s `request()` —
// same reasoning applies to `/resources/upload`, used only on the academy
// side for this slice since students have no create/upload path here).

export function useResourcesForBatch(batchId: string) {
	return useQuery({
		queryKey: ["resources", batchId],
		queryFn: () => api.resources.listForBatch(batchId),
		enabled: !!batchId,
	});
}
