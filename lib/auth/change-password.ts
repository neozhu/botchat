export type PasswordChangeValidationResult =
  | { ok: true; error: null }
  | { ok: false; error: string };

export function validatePasswordChange(
  password: string,
  confirmPassword: string
): PasswordChangeValidationResult {
  if (!password) {
    return {
      ok: false,
      error: "New password is required.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      error: "Passwords do not match.",
    };
  }

  return {
    ok: true,
    error: null,
  };
}
