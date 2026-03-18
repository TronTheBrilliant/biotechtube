export function formatCurrency(
  amount: number,
  currency: string = "USD"
): string {
  const symbol = currency === "EUR" ? "€" : currency === "NOK" ? "kr " : "$";

  if (amount >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    return `${symbol}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `${symbol}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const val = amount / 1_000;
    return `${symbol}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(0)}K`;
  }
  return `${symbol}${amount}`;
}

export function formatNumber(num: number): string {
  if (num >= 1_000) {
    const val = num / 1_000;
    return `${val.toFixed(1)}K`;
  }
  return num.toString();
}

export function formatRelativeTime(daysAgo: number): string {
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "1 day ago";
  if (daysAgo < 7) return `${daysAgo} days ago`;
  if (daysAgo < 14) return "1 week ago";
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
  if (daysAgo < 60) return "1 month ago";
  if (daysAgo < 365) return `${Math.floor(daysAgo / 30)} months ago`;
  return `${Math.floor(daysAgo / 365)} years ago`;
}
