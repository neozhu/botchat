"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validatePasswordChange } from "@/lib/auth/change-password";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error: string | null;
  success: string | null;
  pendingEmail: string | null;
};

export type PasswordActionState = {
  error: string | null;
  success: string | null;
};

function getTrimmedValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getPasswordValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateCredentials(formData: FormData) {
  const email = getTrimmedValue(formData, "email");
  const password = getPasswordValue(formData, "password");

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = validateCredentials(formData);
  if (!parsed) {
    return {
      error: "Email and password are required.",
      success: null,
      pendingEmail: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed);

  if (error) {
    return {
      error: error.message,
      success: null,
      pendingEmail: null,
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = validateCredentials(formData);
  if (!parsed) {
    return {
      error: "Email and password are required.",
      success: null,
      pendingEmail: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp(parsed);

  if (error) {
    return {
      error: error.message,
      success: null,
      pendingEmail: null,
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    error: null,
    success: "We sent you an activation email. Open it, activate your account, then come back here to sign in.",
    pendingEmail: parsed.email,
  };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth");
}

export async function changePasswordAction(
  _previousState: PasswordActionState,
  formData: FormData
): Promise<PasswordActionState> {
  const password = getPasswordValue(formData, "password");
  const confirmPassword = getPasswordValue(formData, "confirmPassword");
  const validation = validatePasswordChange(password, confirmPassword);

  if (!validation.ok) {
    return {
      error: validation.error,
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "Your session expired. Sign in again and retry.",
      success: null,
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error: error.message,
      success: null,
    };
  }

  revalidatePath("/", "layout");

  return {
    error: null,
    success: "Password updated.",
  };
}
