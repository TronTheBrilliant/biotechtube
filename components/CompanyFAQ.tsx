"use client";

import { useState } from "react";
import { Company } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";

interface FAQItem {
  question: string;
  answer: string;
}

function generateFAQItems(company: Company): FAQItem[] {
  const items: FAQItem[] = [];

  // 1. What does the company do?
  const descriptionAnswer = company.description
    ? company.description
    : company.focus.length > 0
      ? `${company.name} is a biotech company focused on ${company.focus.join(", ")}.`
      : `${company.name} is a biotech company.`;
  items.push({
    question: `What does ${company.name} do?`,
    answer: descriptionAnswer,
  });

  // 2. Where is the company located?
  if (company.city || company.country) {
    const location = [company.city, company.country].filter(Boolean).join(", ");
    items.push({
      question: `Where is ${company.name} located?`,
      answer: `${company.name} is headquartered in ${location}.`,
    });
  }

  // 3. Drug pipeline stage
  if (company.stage) {
    items.push({
      question: `What stage is ${company.name}'s drug pipeline?`,
      answer: `${company.name}'s most advanced program is currently in the ${company.stage} stage of development.`,
    });
  }

  // 4. Funding (only if > 0)
  if (company.totalRaised > 0) {
    items.push({
      question: `How much funding has ${company.name} raised?`,
      answer: `${company.name} has raised a total of ${formatCurrency(company.totalRaised)} in funding.`,
    });
  }

  // 5. Publicly traded (only if ticker exists)
  if (company.ticker) {
    items.push({
      question: `Is ${company.name} publicly traded?`,
      answer: `Yes, ${company.name} is publicly traded under the ticker symbol ${company.ticker}.`,
    });
  }

  return items;
}

export function CompanyFAQ({ company }: { company: Company }) {
  const items = generateFAQItems(company);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="px-3.5 pb-4">
      <h2 className="text-13 font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
        Frequently Asked Questions
      </h2>
      <div
        className="rounded-md overflow-hidden"
        style={{
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              borderBottom: index < items.length - 1 ? "1px solid var(--color-border-subtle)" : undefined,
              background: "var(--color-bg-secondary)",
            }}
          >
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left text-13 font-medium cursor-pointer"
              style={{ color: "var(--color-text-primary)" }}
            >
              <span>{item.question}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 ml-2 transition-transform duration-200"
                style={{
                  transform: openIndex === index ? "rotate(180deg)" : "rotate(0deg)",
                  color: "var(--color-text-tertiary)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openIndex === index && (
              <div
                className="px-3 pb-2.5 text-12"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { generateFAQItems };
