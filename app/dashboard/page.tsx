import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Dashboard | BiotechTube",
  description: "Your personal BiotechTube dashboard — track watchlist companies, alerts, and activity.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
