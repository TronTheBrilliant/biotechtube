"use client";

import { useRef } from "react";
import Link from "next/link";

export default function VerifyForm({ slug }: { slug: string }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, value: string) {
    // Allow only single digit
    if (value.length > 1) {
      value = value.slice(-1);
    }

    const input = inputsRef.current[index];
    if (input) {
      input.value = value;
    }

    // Auto-focus next input
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !inputsRef.current[index]?.value && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    pasted.split("").forEach((char, i) => {
      const input = inputsRef.current[i];
      if (input) {
        input.value = char;
      }
    });
    const focusIndex = Math.min(pasted.length, 5);
    inputsRef.current[focusIndex]?.focus();
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Heading */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 500,
          color: "var(--color-text-primary)",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Check your email
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        We sent a 6-digit code to your email
      </p>

      {/* Digit inputs */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 28,
          justifyContent: "center",
        }}
        onPaste={handlePaste}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoFocus={i === 0}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            style={{
              width: 40,
              height: 48,
              textAlign: "center",
              fontSize: 18,
              fontWeight: 500,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "var(--color-border-medium)",
              borderRadius: 6,
              background: "var(--color-bg-primary)",
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
        ))}
      </div>

      {/* Verify button */}
      <button
        type="button"
        style={{
          width: "100%",
          padding: "10px 0",
          background: "var(--color-accent)",
          color: "#fff",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 500,
          border: "none",
          cursor: "pointer",
        }}
      >
        Verify&nbsp;&rarr;
      </button>

      {/* Resend */}
      <p
        style={{
          marginTop: 20,
          fontSize: 13,
          color: "var(--color-text-tertiary)",
          textAlign: "center",
        }}
      >
        Didn&rsquo;t receive it?{" "}
        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-accent)",
            cursor: "pointer",
            fontSize: 13,
            padding: 0,
            textDecoration: "none",
          }}
        >
          Resend code
        </button>
      </p>

      {/* Back link */}
      <Link
        href={`/claim/${slug}`}
        style={{
          marginTop: 16,
          fontSize: 13,
          color: "var(--color-text-secondary)",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        &larr; Back
      </Link>
    </div>
  );
}
