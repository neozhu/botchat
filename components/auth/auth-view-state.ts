export type AuthScreenMode = "sign-in" | "sign-up" | "check-email";

type SignUpStateLike = {
  error: string | null;
  success: string | null;
  pendingEmail: string | null;
};

export function getAuthScreen(
  selectedMode: Exclude<AuthScreenMode, "check-email">,
  signUpState: SignUpStateLike
): AuthScreenMode {
  if (signUpState.pendingEmail && !signUpState.error) {
    return "check-email";
  }

  return selectedMode;
}
