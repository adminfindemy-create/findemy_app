import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: () => api.me.get(),
  });
