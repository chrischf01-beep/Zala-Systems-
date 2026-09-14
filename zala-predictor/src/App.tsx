import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ToastHost } from './components/ToastHost';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Disclaimer } from './components/Disclaimer';
import { SpinnerIcon } from './components/svg/icons';
import { useAuthStore } from './stores/authStore';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const Reset = lazy(() => import('./pages/Reset'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const Predict = lazy(() => import('./pages/Predict'));
const History = lazy(() => import('./pages/History'));
const Statistics = lazy(() => import('./pages/Statistics'));
const MembershipPage = lazy(() => import('./pages/MembershipPage'));
const MyAccountPage = lazy(() => import('./pages/MyAccountPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SpinnerIcon size={32} className="text-primary" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  const { t } = useTranslation('common');
  return (
    <>
      <a href="#main" className="skip-link">
        {t('skip_to_content')}
      </a>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset" element={<Reset />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/predict"
            element={
              <ProtectedRoute>
                <Predict />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics"
            element={
              <ProtectedRoute>
                <Statistics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/membership"
            element={
              <ProtectedRoute>
                <MembershipPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <MyAccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
      <Disclaimer />
      <ToastHost />
    </>
  );
}
