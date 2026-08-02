export type LevelType = "SUBJECT" | "MODULE" | "CHAPTER" | "TOPIC";

export type TopicSource = "SYSTEM" | "USER";

export type VideoState = "UNASSIGNED" | "ASSIGNED" | "COMPLETED";

export type TaskType = "RECORDING" | "TRANSLATION";

export type TaskStatus = "QUEUED" | "IN_PROGRESS" | "RELEASED" | "COMPLETED" | "CANCELLED";

export interface Topic {
  id: number;
  name: string;
  level_type: LevelType;
  source: TopicSource;
  parent_id: number | null;
  notes: string | null;
  sort_order: number;
  is_active: boolean;

  // Video (only meaningful on TOPIC leaves)
  video_state: VideoState;
  s3_key: string | null;
  s3_url: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
  youtube_privacy_status: string | null;
  uploaded_by: string | null;
  video_error: string | null;
  video_uploaded_at: string | null;

  children?: Topic[];
}

/** A node in a topic's subject → module → chapter breadcrumb. */
export interface Breadcrumb {
  id: number;
  name: string;
  level_type: LevelType;
}

export interface Language {
  id: number;
  name: string;
  code: string | null;
}

/** A work item: recording a video, or captioning one in a language. */
export interface Task {
  id: number;
  topic_id: number;
  task_type: TaskType;
  language_id: number | null;
  status: TaskStatus;
  assignee_email: string | null;
  queue_order: number;
  caption_s3_key: string | null;
  caption_s3_url: string | null;
  requested_at: string;
  claimed_at: string | null;
  released_at: string | null;
  completed_at: string | null;
}

/** A task enriched with its topic context (queue / in-progress / etc. lists). */
export interface TaskView extends Task {
  topic_name: string | null;
  breadcrumb: Breadcrumb[];
  language: Language | null;
  /** Display name of `assignee_email`, when that user has one on record. */
  assignee_name: string | null;
  /** Whether the caller may claim this task — only set by GET /tasks/queue/all. */
  eligible?: boolean;
}

/** A completed topic as returned by GET /topics/completed. */
export interface CompletedTopic extends Topic {
  breadcrumb: Breadcrumb[];
  translated_languages: Language[];
}

/** An archived topic as returned by GET /topics/archived. */
export interface ArchivedTopic extends Topic {
  breadcrumb: Breadcrumb[];
}

export interface TopicDetailTask extends Task {
  language: Language | null;
}

export interface TopicDetail {
  topic: Topic;
  breadcrumb: Breadcrumb[];
  tasks: TopicDetailTask[];
  translated_languages: Language[];
}

export interface StepResult {
  success: boolean;
  error: string | null;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  steps: { s3: StepResult; youtube: StepResult; database: StepResult };
  topic: Topic | null;
}
