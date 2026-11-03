import { Navigate, Route, Routes } from 'react-router-dom'
import AdminShell from './AdminShell.jsx'
import LoginPage, { AdminAuthProvider, useAdminAuth } from './auth.jsx'
import { AdmLoading, ConfirmProvider, ToastProvider } from './ui.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import ProjectEditorPage from './pages/ProjectEditorPage.jsx'
import ServicesPage from './pages/ServicesPage.jsx'
import TestimonialsPage from './pages/TestimonialsPage.jsx'
import InquiriesPage from './pages/InquiriesPage.jsx'
import InquiryDetailPage from './pages/InquiryDetailPage.jsx'
import StudioPage from './pages/StudioPage.jsx'
import './admin.css'

function ProtectedRoutes() {
  const { status } = useAdminAuth()
  if (status === 'checking') return <div className="adm-root"><AdmLoading message="Checking your studio session…" /></div>
  if (status !== 'authenticated') return <LoginPage />

  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<ProjectEditorPage />} />
        <Route path="projects/:id" element={<ProjectEditorPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="testimonials" element={<TestimonialsPage />} />
        <Route path="inquiries" element={<InquiriesPage />} />
        <Route path="inquiries/:id" element={<InquiryDetailPage />} />
        <Route path="studio" element={<StudioPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function AdminApp() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminAuthProvider>
          <ProtectedRoutes />
        </AdminAuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}
