import React from "react";
import "./Section.css";

type Props = { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string };
export default function Section({ title, icon, children, className }: Props){
  return (
    <section className={`sectionCard ${className ?? ""}`.trim()}>
      <header className="sectionCard__header">
        <div className="sectionCard__icon" aria-hidden="true">{icon ?? "â–¦"}</div>
        <h3 className="sectionCard__title">{title}</h3>
      </header>
      <div className="sectionCard__body">{children}</div>
    </section>
  );
}

