import type { Metadata } from "next";
import FeedClient from "./FeedClient";

export const metadata: Metadata = {
  title: "Feed | BiotechTube",
  description: "Stay up to date with the latest updates, news, and insights from biotech companies and professionals.",
  openGraph: {
    title: "Feed | BiotechTube",
    description: "Stay up to date with the latest updates, news, and insights from biotech companies and professionals.",
  },
};

export default function FeedPage() {
  return <FeedClient />;
}
