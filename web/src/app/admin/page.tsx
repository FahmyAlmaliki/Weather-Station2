import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return <AdminPanel apiKey={process.env.WEATHER_API_KEY ?? ""} />;
}
