import { redirect } from "next/navigation";

export default function FundingNewsPage() {
  redirect("/funding?tab=news");
}
