import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSavedAcademies() {
  return useQuery({
    queryKey: ["me", "saved-academies"],
    queryFn: () => api.me.savedAcademies.list(),
  });
}

export function useIsAcademySaved(academyId: string) {
  const { data } = useSavedAcademies();
  const items = (data as any)?.items ?? [];
  return items.some((savedAcademy: any) => savedAcademy.id === academyId);
}

export function useToggleSavedAcademy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (academyId: string) => api.me.savedAcademies.toggle(academyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "saved-academies"] });
    },
  });
}
