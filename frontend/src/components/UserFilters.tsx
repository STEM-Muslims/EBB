import React from "react";
import type { Topic } from "../types/topics";
import type { Language } from "../api/languages";

interface UserFiltersProps {
  subjects: Topic[];
  languages: Language[];
  selectedSubjects: number[];
  selectedLanguages: number[];
  onSubjectsChange: (ids: number[]) => void;
  onLanguagesChange: (ids: number[]) => void;
  onClear: () => void;
}

export const UserFilters: React.FC<UserFiltersProps> = ({
  subjects,
  languages,
  selectedSubjects,
  selectedLanguages,
  onSubjectsChange,
  onLanguagesChange,
  onClear,
}) => {
  const hasFilters = selectedSubjects.length > 0 || selectedLanguages.length > 0;

  function handleSelectChange(
    e: React.ChangeEvent<HTMLSelectElement>,
    currentSelected: number[],
    onChange: (ids: number[]) => void
  ) {
    const id = Number(e.target.value);
    if (!id || currentSelected.includes(id)) return;
    onChange([...currentSelected, id]);
    e.target.value = ""; // Reset dropdown after selection
  }

  function removeId(idToRemove: number, currentSelected: number[], onChange: (ids: number[]) => void) {
    onChange(currentSelected.filter((id) => id !== idToRemove));
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1rem",
        backgroundColor: "var(--bg-subtle, rgba(0,0,0,0.02))",
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "var(--radius-md, 8px)",
        marginBottom: "1rem",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Filter Users:
        </span>

        {/* Subject Dropdown */}
        <select
          aria-label="Filter by subject"
          style={{
            padding: "0.35rem 0.5rem",
            borderRadius: "var(--radius-sm, 4px)",
            border: "1px solid var(--border-strong, #ccc)",
            fontSize: "0.85rem",
            backgroundColor: "var(--bg, #fff)",
          }}
          defaultValue=""
          onChange={(e) => handleSelectChange(e, selectedSubjects, onSubjectsChange)}
        >
          <option value="" disabled>+ Add Subject Filter…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || `Subject #${s.id}`}
            </option>
          ))}
        </select>

        {/* Language Dropdown */}
        <select
          aria-label="Filter by language"
          style={{
            padding: "0.35rem 0.5rem",
            borderRadius: "var(--radius-sm, 4px)",
            border: "1px solid var(--border-strong, #ccc)",
            fontSize: "0.85rem",
            backgroundColor: "var(--bg, #fff)",
          }}
          defaultValue=""
          onChange={(e) => handleSelectChange(e, selectedLanguages, onLanguagesChange)}
        >
          <option value="" disabled>+ Add Language Filter…</option>
          {languages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {/* Clear All Button */}
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            style={{
              background: "none",
              border: "none",
              color: "var(--danger, #ef4444)",
              fontSize: "0.8rem",
              cursor: "pointer",
              textDecoration: "underline",
              marginLeft: "auto",
            }}
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Active Filter Pills */}
      {hasFilters && (
        <div style={{
          display: "flex", flexWrap: "wrap",
          gap: "0.4rem", alignItems: "center",
          paddingTop: "0.25rem", borderTop: "1px dashed var(--border, #e5e7eb)"
        }}>
          <span style={{
            fontSize: "0.75rem", color: "var(--text-muted)",
            marginRight: "0.25rem"
          }}>Active:</span>

          {selectedSubjects.map((id) => {
            const subject = subjects.find((s) => s.id === id);
            const label = subject ? subject.name : `Subject #${id}`;
            return (
              <span
                key={`sub-${id}`}
                className="pill"
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                onClick={() => removeId(id, selectedSubjects, onSubjectsChange)}
                title="Click to remove filter"
              >
                {label} ✕
              </span>
            );
          })}

          {selectedLanguages.map((id) => {
            const lang = languages.find((l) => l.id === id);
            const label = lang ? lang.name : `Lang #${id}`;
            return (
              <span
                key={`lang-${id}`}
                className="pill pill--gold"
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                onClick={() => removeId(id, selectedLanguages, onLanguagesChange)}
                title="Click to remove filter"
              >
                {label} ✕
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
