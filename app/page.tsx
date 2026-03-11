import { redirect } from "next/navigation";
import BotchatDashboard from "@/components/botchat/dashboard";
import { getCurrentUser } from "@/lib/auth/user";
import { getBotchatBootstrapData } from "@/lib/botchat/bootstrap";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  const initialData = await getBotchatBootstrapData();

  return <BotchatDashboard initialData={initialData} />;
}
