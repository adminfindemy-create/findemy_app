import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import type { Attachment, PickedAsset } from "@findemy/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

// M2.2: class notes — batch/subject-scoped list/create/update/delete, plus a
// standalone attachment upload used by the shared <AttachmentPicker>.
//
// NOTE: the multipart upload below intentionally does its own bare `fetch`
// instead of going through `@findemy/api-client`'s `request()` — that helper
// always JSON.stringifies its body, so it can't carry a FormData payload (see
// academy-app/src/lib/api.ts's `uploadMultipart` for the same pattern). This
// stays local to this hook file rather than extending student-app/src/lib/api.ts,
// which is outside this slice's file territory.
function getBaseUrl(): string {
	return process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
}

async function uploadNoteAttachment(asset: PickedAsset): Promise<Attachment> {
	const form = new FormData();
	form.append("file", {
		uri: asset.uri,
		name: asset.name,
		type: asset.mimeType,
	} as any);

	const token = useAuth.getState().accessToken;
	const response = await fetch(`${getBaseUrl()}/notes/upload`, {
		method: "POST",
		body: form as any,
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
	});
	if (!response.ok) {
		const errorBody: any = await response.json().catch(() => ({}));
		throw new Error(errorBody?.error?.message ?? "Upload failed");
	}
	const data = (await response.json()) as {
		url: string;
		type: "photo" | "video";
		name?: string;
	};
	return { url: data.url, type: data.type, name: data.name };
}

export function useNoteAttachmentUpload() {
	return uploadNoteAttachment;
}

export function useNotesForBatch(batchId: string) {
	return useQuery({
		queryKey: ["notes", batchId],
		queryFn: () => api.notes.listByBatch(batchId),
		enabled: !!batchId,
	});
}

export function useCreateNote() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: api.notes.create,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["notes", variables.batch_id] });
		},
		onError: (err: any) => {
			Alert.alert("Could not save note", err?.message ?? "Please try again.");
		},
	});
}

export function useUpdateNote(batchId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...payload
		}: {
			id: string;
			title?: string;
			body?: string | null;
			attachment_url?: string | null;
			attachment_type?: "photo" | "video" | null;
			attachment_name?: string | null;
		}) => api.notes.update(id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notes", batchId] });
		},
		onError: (err: any) => {
			Alert.alert("Could not update note", err?.message ?? "Please try again.");
		},
	});
}

export function useDeleteNote(batchId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.notes.remove(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notes", batchId] });
		},
		onError: (err: any) => {
			Alert.alert("Could not delete note", err?.message ?? "Please try again.");
		},
	});
}
