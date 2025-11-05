import React from "react";
import "./InfoBadge.css";

type Tone = "blue" | "green" | "amber" | "pink" | "gray";
type Props = {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  tone?: Tone;       // NEW
  compact?: boolean; // NEW
  className?: string;
};

export default function InfoBadge({ icon, label, value, tone = "gray", compact = false, className }: Props) {
  if (!value || String(value).trim().length === 0) return null;

  return (
    <div className={`infoBadge ${compact ? "infoBadge--compact" : ""} infoBadge--${tone} ${className || ""}`}>
      {icon && <div className="infoBadge__icon" aria-hidden>{icon}</div>}
      <div className="infoBadge__text">
        <div className="infoBadge__label">{label}</div>
        <div className="infoBadge__value" title={String(value)}>{value}</div>
      </div>
    </div>
  );
}

