import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useTrialsMy = (status?: "upcoming" | "past") =>
  useQuery({
    queryKey: ["trials", "my", status],
    queryFn: () => api.trials.my(status ? { status } : undefined),
  });

export const useTrialsToday = () =>
  useQuery({
    queryKey: ["trials", "today"],
    queryFn: () => api.trials.today(),
  });

export const useTrial = (id: string) =>
  useQuery({
    queryKey: ["trial", id],
    queryFn: () => api.trials.get({ id }),
    enabled: !!id,
  });
