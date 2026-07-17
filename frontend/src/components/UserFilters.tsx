import React from "react";
import type { Topic } from "../types/topics";
import type { Language } from "../api/languages";
import styles from "./UserFilters.module.css";

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

  function removeId(
    idToRemove: number,
    currentSelected: number[],
    onChange: (ids: number[]) => void
  ) {
    onChange(currentSelected.filter((id) => id !== idToRemove));
  }

  return (
    <div className={styles.filterContainer}>
      <div className={styles.controlsRow}>
        <span className={styles.filterLabel}>Filter Users:</span>

        {/* Subject Dropdown */}
        <select
          aria-label="Filter by subject"
          className={styles.selectInput}
          defaultValue=""
          onChange={(e) => handleSelectChange(e, selectedSubjects, onSubjectsChange)}
        >
          <option value="" disabled>
            + Add Subject Filter…
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || `Subject #${s.id}`}
            </option>
          ))}
        </select>

        {/* Language Dropdown */}
        <select
          aria-label="Filter by language"
          className={styles.selectInput}
          defaultValue=""
          onChange={(e) => handleSelectChange(e, selectedLanguages, onLanguagesChange)}
        >
          <option value="" disabled>
            + Add Language Filter…
          </option>
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
            className={styles.clearButton}
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Active Filter Pills */}
      {hasFilters && (
        <div className={styles.activeFiltersRow}>
          <span className={styles.activeLabel}>Active:</span>

          {selectedSubjects.map((id) => {
            const subject = subjects.find((s) => s.id === id);
            const label = subject ? subject.name : `Subject #${id}`;
            return (
              <span
                key={`sub-${id}`}
                className={`pill ${styles.filterPill}`}
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
                className={`pill pill--gold ${styles.filterPill}`}
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
