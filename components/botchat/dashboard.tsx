import BotchatDashboardClient from "@/components/botchat/dashboard-client";
import type { BotchatBootstrapData } from "@/lib/botchat/types";

type BotchatDashboardProps = {
  initialData: BotchatBootstrapData;
};

export default function BotchatDashboard({ initialData }: BotchatDashboardProps) {
  return <BotchatDashboardClient initialData={initialData} />;
}
