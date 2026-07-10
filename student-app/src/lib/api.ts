import { createClient } from "@findemy/api-client";
import { useAuth } from "@/stores/auth";
import { enqueueToast } from "@/stores/toast";

function getBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
}

export const api = createClient({
  baseUrl: getBaseUrl(),
  getAccessToken: () => useAuth.getState().accessToken,
  onUnauthorized: async () => {
    if (useAuth.getState().devBypass) {
      return "dev-token";
    }
    const { refreshToken } = useAuth.getState();
    if (!refreshToken) {
      useAuth.getState().clear();
      return null;
    }
    try {
      const res = await api.auth.refresh({ refresh_token: refreshToken });
      const user = useAuth.getState().user;
      const attendanceOtp = useAuth.getState().attendanceOtp ?? "";
      if (user) {
        useAuth.getState().setAuth({
          access: res.access_token,
          refresh: res.refresh_token,
          user,
          attendanceOtp,
        });
      }
      return res.access_token;
    } catch {
      enqueueToast("Your session expired — please sign in again.", "error");
      useAuth.getState().clear();
      return null;
    }
  },
});
