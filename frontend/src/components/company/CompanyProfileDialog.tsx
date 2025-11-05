import React from "react";
import InfoBadge from "../common/InfoBadge";
import "./CompanyProfileDialog.css";

type Props = {
  open: boolean;
  onClose: () => void;
  name: string;
  logo?: string | null;
  overview?: string | null;
  sector?: string | null;
};

export default function CompanyProfileDialog({ open, onClose, name, logo, overview, sector }: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <dialog className="companyDialog" open aria-labelledby="company-title">
        <header className="companyDialog__header">
          <button className="closeBtn" onClick={onClose} aria-label="Fermer">&times;</button>
          <div className="companyDialog__brand">
            {logo ? (
              <img src={logo} alt={`Logo ${name}`} className="companyDialog__logo" />
            ) : (
              <div className="companyDialog__logo companyDialog__logo--default">
                {name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <h1 id="company-title" className="companyDialog__title">{name}</h1>
          {sector && <div className="companyDialog__sector">{sector}</div>}
        </header>

        {overview && (
          <section className="companyDialog__overview">
            <h2>A propos</h2>
            <p>{overview}</p>
          </section>
        )}

        <div className="companyDialog__actions">
          <button className="btn btn--outline" onClick={onClose}>Fermer</button>
        </div>
      </dialog>
    </div>
  );
}

