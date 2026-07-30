const STYLES: Record<string, string> = {
  fatal: "bg-rust-100 text-rust-500",
  serious: "bg-amber-100 text-amber-500",
  slight: "bg-forest-100 text-forest-700",
  non_injury: "bg-forest-50 text-forest-500",
};

const LABELS: Record<string, string> = {
  fatal: "Fatal",
  serious: "Serious",
  slight: "Slight",
  non_injury: "Non-injury",
};

export function NatureBadge({ nature }: { nature: string }) {
  return (
    <span className={`status-pill ${STYLES[nature] ?? "bg-forest-50 text-forest-500"}`}>
      {LABELS[nature] ?? nature}
    </span>
  );
}
