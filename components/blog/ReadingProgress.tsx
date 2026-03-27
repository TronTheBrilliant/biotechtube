"use client";

import { useEffect, useState } from "react";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const article = document.getElementById("article-content");
      if (!article) return;

      const rect = article.getBoundingClientRect();
      const articleTop = rect.top + window.scrollY;
      const articleHeight = article.offsetHeight;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      const start = articleTop;
      const end = articleTop + articleHeight - windowHeight;

      if (scrollY <= start) {
        setProgress(0);
      } else if (scrollY >= end) {
        setProgress(100);
      } else {
        setProgress(((scrollY - start) / (end - start)) * 100);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "3px",
        zIndex: 100,
        background: "transparent",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--color-accent)",
          transition: "width 0.15s ease-out",
        }}
      />
    </div>
  );
}
