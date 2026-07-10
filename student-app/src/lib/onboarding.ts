import type { User } from "@/stores/auth";

/**
 * Returns the route path of the next onboarding step the user must complete,
 * or null if onboarding is complete.
 *
 * Mirrors spec §4.3 logic.
 */
export function nextOnboardingStep(user: User | null | undefined): string | null {
  if (!user) return null;
  if (!user.name || !user.location) return "/(auth)/onboarding";
  if (!user.interests || user.interests.length === 0) return "/(auth)/interests";
  return null;
}
