import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-dvh px-6 py-8 md:px-10">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg items-center justify-center">
        <section className="relative w-full">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_15%_20%,rgba(126,92,186,0.12),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(205,145,88,0.14),transparent_28%)] blur-2xl" />
          <AuthForm />
        </section>
      </div>
    </main>
  );
}
