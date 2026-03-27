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

export function CompanyFAQJsonLd({ company }: { company: Company }) {
  const items = generateFAQItems(company);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
    />
  );
}
