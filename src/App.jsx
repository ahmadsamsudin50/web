import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Komponen Utama
import LandingPage from "./pages/LandingPage";
import Login from './pages/Login';
import Register from './pages/Register';
import AuthGuard from './components/AuthGuard';
import LayoutAdmin from './components/LayoutAdmin';
import LayoutStudentComponent from './components/LayoutStudent';
import LayoutCoach from "./components/LayoutCoach";

// Halaman Admin
import Dashboard from './pages/admin/Dashboard';
import LandingManage from './pages/admin/LandingManage';
import ClassManage from './pages/admin/ClassManage';
import StudentManage from './pages/admin/StudentManage';
import CoachManage from "./pages/admin/CoachManage";
import Payments from './pages/admin/Payments';
import SessionManage from './pages/admin/SessionManage';
import ScanQR from './pages/admin/ScanQR';
import ManualEntry from './pages/admin/ManualEntry';
import Recap from './pages/admin/Recap';
import AnnouncementManage from './pages/admin/AnnouncementManage';

// Halaman Student
import Profile from './pages/student/Profile';
import Enrollment from './pages/student/Enrollment';
import History from './pages/student/History';
import Schedule from "./pages/student/Schedule";

// Halaman Coach
import CoachProfile from "./pages/coach/CoachProfile";
import CoachSchedule from "./pages/coach/CoachSchedule";
import CoachLogs from "./pages/coach/CoachLogs";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ============================================== */}
        {/* RUTE ADMIN                                     */}
        {/* ============================================== */}
        <Route
          path="/admin"
          element={
            <AuthGuard allowedRole="admin">
              <LayoutAdmin />
            </AuthGuard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="landing" element={<LandingManage />} />
          <Route path="classes" element={<ClassManage />} />
          <Route path="students" element={<StudentManage />} />
          <Route path="coaches" element={<CoachManage />} />
          <Route path="payments" element={<Payments />} />
          <Route path="sessions" element={<SessionManage />} />
          <Route path="scan" element={<ScanQR />} />
          <Route path="manual-entry" element={<ManualEntry />} />
          <Route path="recap" element={<Recap />} />
          <Route path="announcements" element={<AnnouncementManage />} />
        </Route>

        {/* ============================================== */}
        {/* RUTE STUDENT                                   */}
        {/* ============================================== */}
        <Route
          path="/student"
          element={
            <AuthGuard allowedRole="student">
              <LayoutStudentComponent />
            </AuthGuard>
          }
        >
          <Route index element={<Profile />} />
          <Route path="enroll" element={<Enrollment />} />
          <Route path="history" element={<History />} />
          <Route path="schedule" element={<Schedule />} />
        </Route>

        {/* ============================================== */}
        {/* RUTE COACH                                     */}
        {/* ============================================== */}
        <Route
          path="/coach"
          element={
            <AuthGuard allowedRole="coach">
              <LayoutCoach />
            </AuthGuard>
          }
        >
          <Route index element={<CoachProfile />} />
          <Route path="schedule" element={<CoachSchedule />} />
          <Route path="logs" element={<CoachLogs />} />
        </Route>

        {/* Fallback route jika halaman tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;