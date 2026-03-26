"use client";

import { Play } from "lucide-react";

interface VideoEmbedProps {
  url: string;
  title?: string;
  brandColor?: string;
}

function extractVideoId(url: string): { provider: "youtube" | "vimeo" | null; id: string | null } {
  // YouTube: various formats
  const ytMatch =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { provider: "youtube", id: ytMatch[1] };

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { provider: "vimeo", id: vimeoMatch[1] };

  return { provider: null, id: null };
}

export function VideoEmbed({ url, title = "Company Overview", brandColor = "#1a7a5e" }: VideoEmbedProps) {
  const { provider, id } = extractVideoId(url);

  if (!provider || !id) {
    return null;
  }

  const embedUrl =
    provider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${id}?rel=0`
      : `https://player.vimeo.com/video/${id}?byline=0&portrait=0`;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Play size={16} style={{ color: brandColor }} />
        <h2
          className="text-[17px] font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </h2>
      </div>

      <div
        className="relative w-full rounded-xl overflow-hidden"
        style={{
          paddingBottom: "56.25%",
          boxShadow: `0 4px 20px ${brandColor}10`,
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}
