import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import AdminRoute from "./components/AdminRoute";
import HomePage from "./pages/HomePage";
import UploadPage from "./pages/UploadPage";
import AboutPage from "./pages/AboutPage";
import TestPage from "./pages/TestPage";
import TopicManagerPage from "./pages/TopicManagerPage";
import LoginPage from "./pages/admin/LoginPage";
import CallbackPage from "./pages/admin/CallbackPage";
import DashboardPage from "./pages/admin/DashboardPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no Layout, no auth */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/callback" element={<CallbackPage />} />

        {/* Protected routes — Layout + AdminRoute wraps everything */}
        <Route
          path="/*"
          element={
            <AdminRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/topic_manage" element={<TopicManagerPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/test" element={<TestPage />} />
                  <Route path="/admin/dashboard" element={<DashboardPage />} />
                </Routes>
              </Layout>
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
