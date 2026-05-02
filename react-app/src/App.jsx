import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AlumniLogin from './pages/AlumniLogin'
import AlumniRegister from './pages/AlumniRegister'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AlumniDashboard from './pages/AlumniDashboard'
import StudentLogin from './pages/StudentLogin'
import StudentRegister from './pages/StudentRegister'
import StudentDashboard from './pages/StudentDashboard'
import EventDetailsPage from './pages/EventDetailsPage'
import AlumniForgotPassword from './pages/AlumniForgotPassword'
import StudentForgotPassword from './pages/StudentForgotPassword'
import ProfileViewPage from './pages/ProfileViewPage'
import EditProfilePage from './pages/EditProfilePage'
import './styles/style.css'
import './styles/profile-image.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/alumni-login" element={<AlumniLogin />} />
        <Route path="/alumni-forgot-password" element={<AlumniForgotPassword />} />
        <Route path="/alumni-register" element={<AlumniRegister />} />
        <Route path="/alumni-dashboard" element={<AlumniDashboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/student-forgot-password" element={<StudentForgotPassword />} />
        <Route path="/student-register" element={<StudentRegister />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/my-profile" element={<ProfileViewPage />} />
        <Route path="/profile/:id" element={<ProfileViewPage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/event-details/:eventId" element={<EventDetailsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
