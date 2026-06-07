export type LevelType = "SUBJECT" | "TOPIC" | "VIDEO";

export interface Topic {
  id: number;
  name: string;
  level_type: LevelType;
  parent_id: number | null;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
  children?: Topic[];
}
