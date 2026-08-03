import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout, { type NavItem } from "./components/Layout";
import { RequireAdmin, RequireUser } from "./components/guards";
import LoginPage from "./pages/admin/LoginPage";
import CallbackPage from "./pages/admin/CallbackPage";
import DashboardPage from "./pages/admin/DashboardPage";
import TopicManagerPage from "./pages/TopicManagerPage";
import TopicDetailPage from "./pages/TopicDetailPage";
import TaskQueuePage from "./pages/TaskQueuePage";
import InProgressPage from "./pages/InProgressPage";
import QueueManagePage from "./pages/QueueManagePage";
import VideoManagerPage from "./pages/VideoManagerPage";
import ManualAssignmentsPage from "./pages/admin/ManualAssignmentsPage";
import UserHomePage from "./pages/user/HomePage";
import UserVideosPage from "./pages/user/VideosPage";
import UserTopicsPage from "./pages/user/TopicsPage";
import ProfilePage from "./pages/user/ProfilePage";

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: "◆", exact: true },
  { to: "/admin/topics", label: "Topics", icon: "◈" },
  {
    to: "/admin/tasks",
    label: "Tasks",
    icon: "↑",
    children: [
      { to: "/admin/tasks/queue", label: "Task queue" },
      { to: "/admin/tasks/in-progress", label: "In-progress" },
      { to: "/admin/tasks/manage", label: "Queue management" },
      { to: "/admin/tasks/assignments", label: "Manual assignments" },
    ],
  },
  { to: "/admin/videos", label: "Videos Uploaded", icon: "▦" },
];

const USER_NAV: NavItem[] = [
  { to: "/", label: "Home", icon: "⌂", exact: true },
  { to: "/topics", label: "Topics", icon: "◈" },
  {
    to: "/tasks",
    label: "Tasks",
    icon: "↑",
    children: [
      { to: "/tasks/queue", label: "Task queue" },
      { to: "/tasks/in-progress", label: "In-progress" },
    ],
  },
  { to: "/videos", label: "Videos Uploaded", icon: "▦" },
];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Sign-in — the only routes reachable without authentication */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/callback" element={<CallbackPage />} />

        {/* Admin UI — admins only */}
        <Route
          path="/admin/*"
          element={
            <RequireAdmin>
              <Layout label="Admin" navItems={ADMIN_NAV}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/topics" element={<TopicManagerPage />} />
                  <Route
                    path="/topics/folder/:folderId"
                    element={<TopicManagerPage />}
                  />
                  <Route path="/topics/:id" element={<TopicDetailPage />} />
                  <Route
                    path="/tasks"
                    element={<Navigate to="/admin/tasks/queue" replace />}
                  />
                  <Route path="/tasks/queue" element={<TaskQueuePage />} />
                  <Route path="/tasks/in-progress" element={<InProgressPage />} />
                  <Route path="/tasks/manage" element={<QueueManagePage />} />
                  <Route path="/tasks/assignments" element={<ManualAssignmentsPage />} />
                  <Route path="/videos" element={<VideoManagerPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Routes>
              </Layout>
            </RequireAdmin>
          }
        />

        {/* Non-admin UI — signed-in members only */}
        <Route
          path="/*"
          element={
            <RequireUser>
              <Layout navItems={USER_NAV}>
                <Routes>
                  <Route path="/" element={<UserHomePage />} />
                  <Route path="/topics" element={<UserTopicsPage />} />
                  <Route
                    path="/topics/folder/:folderId"
                    element={<UserTopicsPage />}
                  />
                  <Route path="/topics/:id" element={<TopicDetailPage />} />
                  <Route
                    path="/tasks"
                    element={<Navigate to="/tasks/queue" replace />}
                  />
                  <Route path="/tasks/queue" element={<TaskQueuePage />} />
                  <Route path="/tasks/in-progress" element={<InProgressPage />} />
                  <Route path="/videos" element={<UserVideosPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Routes>
              </Layout>
            </RequireUser>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
