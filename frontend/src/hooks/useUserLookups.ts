import { useEffect, useState } from "react";
import { languagesApi, type Language } from "../api/languages";
import { topicsApi } from "../api/topics";
import type { Topic } from "../types/topics";

interface UserLookups {
  subjectsMap: Map<number, string>;
  languagesMap: Map<number, { name: string; code: string | null }>;
  isLoading: boolean;
  error: string | null;
}

export function useUserLookups(): UserLookups {
  const [subjectsMap, setSubjectsMap] = useState<Map<number, string>>(new Map());
  const [languagesMap, setLanguagesMap] = useState<Map<number, { name: string; code: string | null }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLookups() {
      try {
        setIsLoading(true);
        // Fetch subjects and languages concurrently
        const [subjects, languages] = await Promise.all([
          topicsApi.getSubjects(),
          languagesApi.getAll(),
        ]);

        if (!isMounted) return;
        const sMap = new Map<number, string>();
        subjects.forEach((s: Topic) => {
          sMap.set(s.id, s.name || `Subject #${s.id}`);
        });

        const lMap = new Map<number, { name: string; code: string | null }>();
        languages.forEach((l: Language) => {
          lMap.set(l.id, { name: l.name, code: l.code });
        });

        setSubjectsMap(sMap);
        setLanguagesMap(lMap);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load user lookup data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadLookups();

    return () => {
      isMounted = false;
    };
  }, []);

  return { subjectsMap, languagesMap, isLoading, error };
}
