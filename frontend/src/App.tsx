import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import UploadPage from "./pages/UploadPage";
import AboutPage from "./pages/AboutPage";
import TestPage from "./pages/TestPage";
import LoginPage from "./pages/admin/LoginPage";
import CallbackPage from "./pages/admin/CallbackPage";
import DashboardPage from "./pages/admin/DashboardPage";
import AdminRoute from "./components/AdminRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/callback" element={<CallbackPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <DashboardPage />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
