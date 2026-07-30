import { useEffect, useState } from "react";
import { tasksApi } from "../../api/tasks";
import { useUserLookups } from "../../hooks/useUserLookups";
import { crumbText, kindLabel } from "../../lib/taskLabels";
import type { TaskView } from "../../types/topics";
import styles from "./ManualAssignmentsPage.module.css";

interface EligibleUser {
  id: number;
  email: string;
  avatar_url: string | null;
}

export default function ManualAssignmentsPage() {
  const { subjectsMap, languagesMap, isLoading: lookupsLoading } = useUserLookups();
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [userQuery, setUserQuery] = useState("");

  // Modal editing state
  const [selectedTask, setSelectedTask] = useState<TaskView | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTasks = async (showLoading = false) => {
    if (showLoading) {
      setLoadingTasks(true);
    }
    setErrorMsg(null);
    try {
      const data = await tasksApi.getAdminAll();
      setTasks(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchTasks = async () => {
      try {
        const data = await tasksApi.getAdminAll();
        if (active) setTasks(data);
      } catch (err) {
        if (active) setErrorMsg(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        if (active) setLoadingTasks(false);
      }
    };
    fetchTasks();
    return () => {
      active = false;
    };
  }, []);

  // Handle opening edit modal
  const handleEditTask = async (task: TaskView) => {
    setSelectedTask(task);
    setEditStatus(task.status);
    setEditAssignee(task.assignee_email || "");
    setSaveError(null);
    setEligibleUsers([]);

    // Fetch eligible users for this task
    try {
      setLoadingEligible(true);
      const users = await tasksApi.getEligibleUsers(task.id);
      setEligibleUsers(users);
    } catch {
      setSaveError("Could not load eligible users list.");
    } finally {
      setLoadingEligible(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTask) return;
    setSaving(true);
    setSaveError(null);

    // Basic frontend validations
    if ((editStatus === "IN_PROGRESS" || editStatus === "COMPLETED") && !editAssignee) {
      setSaveError("Please select an assignee for this status");
      setSaving(false);
      return;
    }

    try {
      await tasksApi.adminUpdate(selectedTask.id, {
        status: editStatus,
        assignee_email: editAssignee || null,
      });
      setSelectedTask(null);
      loadTasks(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save task update");
    } finally {
      setSaving(false);
    }
  };

  // Status style helper
  const getStatusClassName = (status: string) => {
    switch (status) {
      case "QUEUED":
        return `${styles.statusPill} ${styles.statusQueued}`;
      case "IN_PROGRESS":
        return `${styles.statusPill} ${styles.statusInProgress}`;
      case "RELEASED":
        return `${styles.statusPill} ${styles.statusReleased}`;
      case "COMPLETED":
        return `${styles.statusPill} ${styles.statusCompleted}`;
      case "CANCELLED":
        return `${styles.statusPill} ${styles.statusCancelled}`;
      default:
        return styles.statusPill;
    }
  };

  // Convert map key values to list for dropdowns
  const subjectsList = Array.from(subjectsMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));
  const languagesList = Array.from(languagesMap.entries()).map(([id, data]) => ({
    id,
    name: data.name,
  }));

  // Filtering implementation
  const filteredTasks = tasks.filter((t) => {
    // 1. Breadcrumb / Topic name query
    const taskName = t.topic_name?.toLowerCase() || "";
    const crumbs = crumbText(t).toLowerCase();
    const matchesSearch =
      taskName.includes(searchQuery.toLowerCase()) ||
      crumbs.includes(searchQuery.toLowerCase());

    // 2. Subject filter (checking subject ancestor id)
    // Find subject ID in breadcrumb (or t.topic_id if topic is subject level itself, though tasks are only on topic-level)
    const subjectCrumb = t.breadcrumb.find((b) => b.level_type === "SUBJECT");
    const matchesSubject =
      !selectedSubject ||
      (subjectCrumb && String(subjectCrumb.id) === selectedSubject);

    // 3. Status filter
    const matchesStatus = !selectedStatus || t.status === selectedStatus;

    // 4. Task type filter
    const matchesType = !selectedType || t.task_type === selectedType;

    // 5. Language filter
    const matchesLanguage =
      !selectedLanguage ||
      (t.language_id && String(t.language_id) === selectedLanguage);

    // 6. Assigned User filter
    const matchesUser =
      !userQuery ||
      (t.assignee_email &&
        t.assignee_email.toLowerCase().includes(userQuery.toLowerCase()));

    return (
      matchesSearch &&
      matchesSubject &&
      matchesStatus &&
      matchesType &&
      matchesLanguage &&
      matchesUser
    );
  });

  return (
    <div className={styles.pageWrap}>
      <div className="pageHead">
        <div className="pageHeadText">
          <span className="pageEyebrow">Administration</span>
          <h1>Manual Assignments</h1>
          <p className="pageSub">
            Directly select, modify, assign, requeue, or force-complete any task in the system.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filtersGrid}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Search Topics</label>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="e.g. Calculus, Fractions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Subject</label>
          <select
            className={styles.filterSelect}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjectsList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status</label>
          <select
            className={styles.filterSelect}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="QUEUED">QUEUED (Unclaimed)</option>
            <option value="IN_PROGRESS">IN_PROGRESS (Claimed)</option>
            <option value="RELEASED">RELEASED (Awaiting requeue)</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED (Archived)</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Task Type</label>
          <select
            className={styles.filterSelect}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="RECORDING">RECORDING</option>
            <option value="TRANSLATION">TRANSLATION</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Target Language</label>
          <select
            className={styles.filterSelect}
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="">All Languages</option>
            {languagesList.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>User Assignee</label>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="Search email..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content */}
      {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

      {loadingTasks || lookupsLoading ? (
        <p className={styles.emptyState}>Loading tasks and curriculum database...</p>
      ) : filteredTasks.length === 0 ? (
        <div className="card">
          <p className={styles.emptyState}>No tasks found matching your filters.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className={styles.tasksTable}>
            <thead>
              <tr>
                <th>Curriculum Pathway & Topic</th>
                <th>Task Type</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Created / Completed</th>
                <th style={{ width: 100, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => {
                const dateCreated = t.requested_at
                  ? new Date(t.requested_at).toLocaleDateString()
                  : "N/A";
                const dateCompleted = t.completed_at
                  ? new Date(t.completed_at).toLocaleDateString()
                  : null;

                return (
                  <tr key={t.id}>
                    <td>
                      <div className="pageSub" style={{ fontSize: "0.75rem", marginBottom: 2 }}>
                        {crumbText(t)}
                      </div>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {t.topic_name || `Topic #${t.topic_id}`}
                      </strong>
                    </td>
                    <td>
                      <span className="pill pill--stone">{kindLabel(t)}</span>
                    </td>
                    <td>
                      <span className={getStatusClassName(t.status)}>{t.status}</span>
                    </td>
                    <td>
                      {t.assignee_email ? (
                        <div className={styles.userCell}>
                          <div className={styles.userAvatar}>
                            {t.assignee_email.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{t.assignee_email}</span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: "0.8rem" }}>Created: {dateCreated}</div>
                      {dateCompleted && (
                        <div style={{ fontSize: "0.8rem", color: "var(--brand)" }}>
                          Done: {dateCompleted}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn--sm"
                        onClick={() => handleEditTask(t)}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {selectedTask && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Manual Task Manager</h3>
              <button className={styles.btnClose} onClick={() => setSelectedTask(null)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {saveError && <div className={styles.errorBanner}>{saveError}</div>}

              {/* Task Details Info Card */}
              <div className={styles.taskSummaryCard}>
                <span className={styles.filterLabel}>{crumbText(selectedTask)}</span>
                <strong style={{ fontSize: "1rem" }}>{selectedTask.topic_name}</strong>
                <div style={{ marginTop: "0.25rem" }}>
                  <span className="pill pill--stone" style={{ marginRight: "0.5rem" }}>
                    {kindLabel(selectedTask)}
                  </span>
                  <span className={getStatusClassName(selectedTask.status)}>
                    Current: {selectedTask.status}
                  </span>
                </div>
              </div>

              {/* Status Select */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>Target Status</label>
                <select
                  className={styles.formSelect}
                  value={editStatus}
                  onChange={(e) => {
                    const status = e.target.value;
                    setEditStatus(status);
                    // Clear assignee if moving to unassigned state
                    if (status === "QUEUED" || status === "CANCELLED" || status === "RELEASED") {
                      setEditAssignee("");
                    }
                  }}
                >
                  <option value="QUEUED">QUEUED (Unclaimed)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Active)</option>
                  <option value="RELEASED">RELEASED (Awaiting requeue)</option>
                  <option value="COMPLETED">COMPLETED (Force-complete)</option>
                  <option value="CANCELLED">CANCELLED (Archived)</option>
                </select>
              </div>

              {/* Assignee Select - Show for all except CANCELLED so they can assign queued tasks easily */}
              {editStatus !== "CANCELLED" && (
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Eligible Assignee (filtered by role & subject/language)
                  </label>
                  {loadingEligible ? (
                    <div className="pageSub">Fetching eligible users...</div>
                  ) : eligibleUsers.length === 0 ? (
                    <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
                      No eligible users found! Make sure users are registered with the appropriate
                      roles (TEACHER for recordings, TRANSLATOR for translations) and have subject
                      specialties matching this task's subject or language.
                    </div>
                  ) : (
                    <select
                      className={styles.formSelect}
                      value={editAssignee}
                      onChange={(e) => {
                        const newAssignee = e.target.value;
                        setEditAssignee(newAssignee);
                        // Auto-switch to IN_PROGRESS if they assign a user while it's currently unassigned
                        if (newAssignee && (editStatus === "QUEUED" || editStatus === "RELEASED")) {
                          setEditStatus("IN_PROGRESS");
                        }
                      }}
                    >
                      <option value="">-- Select Eligible User (Unassigned) --</option>
                      {/* If existing assignee is not in the eligible list (rare), render them so we don't lose them */}
                      {selectedTask.assignee_email &&
                        !eligibleUsers.some((u) => u.email === selectedTask.assignee_email) && (
                          <option value={selectedTask.assignee_email}>
                            {selectedTask.assignee_email} (Current Assignee)
                          </option>
                        )}
                      {eligibleUsers.map((u) => (
                        <option key={u.id} value={u.email}>
                          {u.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className="btn btn--secondary"
                onClick={() => setSelectedTask(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleSave}
                disabled={
                  saving ||
                  loadingEligible ||
                  ((editStatus === "IN_PROGRESS" || editStatus === "COMPLETED") && !editAssignee)
                }
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
