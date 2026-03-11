"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  type PasswordActionState,
} from "@/app/auth/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const initialPasswordState: PasswordActionState = {
  error: null,
  success: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Updating..." : "Update password"}
    </Button>
  );
}

export type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ChangePasswordDialogBody({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [state, formAction] = useActionState(changePasswordAction, initialPasswordState);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] border-white/70 bg-white/95 shadow-[0_30px_120px_-60px_rgba(18,15,55,0.62)] sm:max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle className="font-[var(--font-display)] text-2xl tracking-tight">
            Change password
          </DialogTitle>
          <DialogDescription className="text-sm leading-6">
            Set a new password for your account. You can use it the next time you sign in.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="change-password-new">
              New password
            </label>
            <Input
              id="change-password-new"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Choose a new password"
              required
              className="h-11 rounded-xl bg-white/80"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="change-password-confirm">
              Confirm password
            </label>
            <Input
              id="change-password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat the new password"
              required
              className="h-11 rounded-xl bg-white/80"
            />
          </div>

          {state.error ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertTitle>Password update failed</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {state.success ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
              <AlertTitle>Password updated</AlertTitle>
              <AlertDescription className="text-emerald-800">
                {state.success}
              </AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChangePasswordDialog(props: ChangePasswordDialogProps) {
  if (!props.open) return null;
  return <ChangePasswordDialogBody {...props} />;
}
