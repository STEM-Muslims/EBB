import React, { useState } from "react";

interface UserAttributesListProps {
  ids: number[];
  type: "subject" | "language";
  lookupMap: Map<number, any>;
  maxItems?: number;
}

export const UserAttributesList: React.FC<UserAttributesListProps> = ({
  ids = [],
  type,
  lookupMap,
  maxItems = 2,
}) => {
  const [showAll, setShowAll] = useState(false);

  if (!ids || ids.length === 0) {
    return <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>;
  }

  // Determine pill styling based on your design system tokens
  // Subjects -> deep emerald (.pill)
  // Languages -> warm bronze-gold (.pill--gold)
  const pillClass = type === "subject" ? "pill" : "pill pill--gold";

  const visibleIds = showAll ? ids : ids.slice(0, maxItems);
  const hiddenCount = ids.length - visibleIds.length;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
      {visibleIds.map((id) => {
        const item = lookupMap.get(id);
        
        // Resolve label and optional language code
        let label = `ID #${id}`;
        let badgeCode = null;

        if (item) {
          if (type === "language") {
            label = item.name;
            badgeCode = item.code ? item.code.toUpperCase() : null;
          } else {
            label = typeof item === "string" ? item : item.name || item.title;
          }
        }

        return (
          <span key={id} className={pillClass} title={label}>
            {badgeCode && (
              <strong style={{ opacity: 0.75, fontSize: "0.7rem", marginRight: "0.15rem" }}>
                [{badgeCode}]
              </strong>
            )}
            {label}
          </span>
        );
      })}

      {/* Interactive Overflow Tag */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="btn btn--ghost btn--sm"
          style={{
            padding: "0.15rem 0.5rem",
            minHeight: "auto",
            fontSize: "0.75rem",
            borderRadius: "var(--radius-pill)",
            border: "1px dashed var(--border-strong)",
          }}
          title="Click to see all"
        >
          +{hiddenCount} more
        </button>
      )}

      {showAll && ids.length > maxItems && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="btn btn--ghost btn--sm"
          style={{
            padding: "0.15rem 0.4rem",
            minHeight: "auto",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
          title="Collapse list"
        >
          Show less
        </button>
      )}
    </div>
  );
};