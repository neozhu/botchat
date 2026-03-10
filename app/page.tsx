import BotchatDashboard from "@/components/botchat/dashboard";
import { getBotchatBootstrapData } from "@/lib/botchat/bootstrap";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialData = await getBotchatBootstrapData();

  return <BotchatDashboard initialData={initialData} />;
}
