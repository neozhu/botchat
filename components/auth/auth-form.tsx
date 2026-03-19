"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, MailCheck, Sparkles } from "lucide-react";
import {
  signInAction,
  signUpAction,
  type AuthActionState,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { getAuthScreen, type AuthScreenMode } from "./auth-view-state";

const initialAuthActionState: AuthActionState = {
  error: null,
  success: null,
  pendingEmail: null,
};

function SubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

function AuthStatus({ state }: { state: AuthActionState }) {
  if (state.error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.success}
      </p>
    );
  }

  return null;
}

export function AuthForm() {
  const [selectedMode, setSelectedMode] = useState<"sign-in" | "sign-up">(
    "sign-in"
  );
  const [checkEmailDismissed, setCheckEmailDismissed] = useState(false);
  const [signInState, signInFormAction] = useActionState(signInAction, {
    ...initialAuthActionState,
  });
  const [signUpState, signUpFormAction] = useActionState(signUpAction, {
    ...initialAuthActionState,
  });
  const currentScreen = getAuthScreen(
    selectedMode,
    signUpState,
    checkEmailDismissed
  );

  const changeMode = (
    mode: Exclude<AuthScreenMode, "check-email">,
    options?: { dismissCheckEmail?: boolean }
  ) => {
    setSelectedMode(mode);
    if (options?.dismissCheckEmail) {
      setCheckEmailDismissed(true);
    }
  };

  return (
    <Card className="border-white/70 bg-white/85 shadow-[0_30px_120px_-60px_rgba(18,15,55,0.62)] backdrop-blur">
      <CardHeader className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent-line)]">
              Account Access
            </p>
            <CardTitle className="font-[var(--font-display)] text-3xl leading-tight">
              {currentScreen === "check-email"
                ? "Check your inbox"
                : currentScreen === "sign-up"
                  ? "Create your account"
                  : "Welcome back"}
            </CardTitle>
            <CardDescription className="max-w-md text-sm leading-6">
              {currentScreen === "check-email"
                ? "Activate your account from the email we just sent, then return here to sign in."
                : currentScreen === "sign-up"
                  ? "Set up your private Botchat workspace. Account activation happens by email."
                  : "Sign in to continue into your private Botchat workspace."}
            </CardDescription>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent-line)]/15 bg-[var(--accent-line)]/10 text-[var(--accent-line)]">
            {currentScreen === "check-email" ? (
              <MailCheck className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </div>
        </div>

        {currentScreen !== "check-email" ? (
          <div className="inline-flex rounded-full border border-black/10 bg-black/5 p-1">
            <button
              type="button"
              onClick={() => changeMode("sign-in")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                currentScreen === "sign-in"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => changeMode("sign-up")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                currentScreen === "sign-up"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create account
            </button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-5">
        {currentScreen === "sign-in" ? (
          <form action={signInFormAction} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sign-in-email">
                Email
              </label>
              <Input
                id="sign-in-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="h-11 rounded-xl bg-white/80"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sign-in-password">
                Password
              </label>
              <PasswordInput
                id="sign-in-password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="h-11 rounded-xl bg-white/80"
              />
            </div>
            <AuthStatus state={signInState} />
            <SubmitButton idleLabel="Sign in" pendingLabel="Signing in..." />
          </form>
        ) : null}

        {currentScreen === "sign-up" ? (
          <form
            action={(formData) => {
              setCheckEmailDismissed(false);
              signUpFormAction(formData);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sign-up-email">
                Email
              </label>
              <Input
                id="sign-up-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="h-11 rounded-xl bg-white/80"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sign-up-password">
                Password
              </label>
              <PasswordInput
                id="sign-up-password"
                name="password"
                autoComplete="new-password"
                placeholder="Choose a strong password"
                required
                className="h-11 rounded-xl bg-white/80"
              />
            </div>
            {signUpState.error ? <AuthStatus state={signUpState} /> : null}
            <SubmitButton idleLabel="Create account" pendingLabel="Creating..." />
            <p className="text-xs leading-5 text-muted-foreground">
              After registration, we will ask you to activate the account from
              your email before signing in.
            </p>
          </form>
        ) : null}

        {currentScreen === "check-email" ? (
          <div className="space-y-5">
            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 p-5">
              <p className="text-sm font-semibold text-emerald-900">
                Activation email sent
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-800/90">
                We sent an activation link to{" "}
                <span className="font-semibold">
                  {signUpState.pendingEmail ?? "your email"}
                </span>
                . Open the link, activate your account, then return here to sign
                in.
              </p>
            </div>

            <div className="rounded-2xl border border-black/8 bg-black/[0.025] p-4">
              <p className="text-sm font-medium text-foreground">
                What to do next
              </p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>1. Open your inbox and find the message from Supabase.</p>
                <p>2. Click the activation link in that email.</p>
                <p>3. Come back here and sign in with the same account.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => changeMode("sign-in", { dismissCheckEmail: true })}
                className="rounded-full"
              >
                Back to sign in
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => changeMode("sign-up", { dismissCheckEmail: true })}
                className="rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
                Use another email
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
