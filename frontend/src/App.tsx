import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout, { type NavItem } from "./components/Layout";
import { RequireAdmin, RequireUser } from "./components/guards";
import LoginPage from "./pages/admin/LoginPage";
import CallbackPage from "./pages/admin/CallbackPage";
import DashboardPage from "./pages/admin/DashboardPage";
import TopicManagerPage from "./pages/TopicManagerPage";
import UploadPage from "./pages/UploadPage";
import VideoManagerPage from "./pages/VideoManagerPage";
import UserHomePage from "./pages/user/HomePage";
import UserVideosPage from "./pages/user/VideosPage";
import UserTopicsPage from "./pages/user/TopicsPage";

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: "◆", exact: true },
  { to: "/admin/topics", label: "Topics", icon: "◈" },
  { to: "/admin/upload", label: "Upload", icon: "↑" },
  { to: "/admin/videos", label: "Videos", icon: "▦" },
];

const USER_NAV: NavItem[] = [
  { to: "/", label: "Home", icon: "⌂", exact: true },
  { to: "/upload", label: "Upload", icon: "↑" },
  { to: "/videos", label: "Videos", icon: "▦" },
  { to: "/topics", label: "Topics", icon: "◈" },
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
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/videos" element={<VideoManagerPage />} />
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
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/videos" element={<UserVideosPage />} />
                  <Route path="/topics" element={<UserTopicsPage />} />
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
