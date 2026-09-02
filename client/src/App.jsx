import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth } from './api.js';
import Footer from './components/Footer.jsx';
import OverlayAd from './components/OverlayAd.jsx';
import Home from './pages/Home.jsx';
import JobBoard from './pages/JobBoard.jsx';
import JobDetail from './pages/JobDetail.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Privacy from './pages/Privacy.jsx';
import Cookies from './pages/Cookies.jsx';
import Terms from './pages/Terms.jsx';
import NotFound from './pages/NotFound.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminJobs from './pages/AdminJobs.jsx';
import AdminApplications from './pages/AdminApplications.jsx';
import AdminAds from './pages/AdminAds.jsx';
import AdminSettings from './pages/AdminSettings.jsx';

function RequireAdmin({ children }) {
  const location = useLocation();
  if (!auth.get()) return <Navigate to="/admin" replace state={{ from: location }} />;
  return children;
}

const ADMIN_ROUTES = [
  { path: '/admin/jobs', element: <AdminJobs /> },
  { path: '/admin/applications', element: <AdminApplications /> },
  { path: '/admin/ads', element: <AdminAds /> },
  { path: '/admin/settings', element: <AdminSettings /> },
];

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <>
      <OverlayAd />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<JobBoard />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/terms" element={<Terms />} />

        <Route path="/admin" element={<AdminLogin />} />
        {ADMIN_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<RequireAdmin>{route.element}</RequireAdmin>}
          />
        ))}

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* The admin area has its own navigation and needs no public footer. */}
      {!isAdmin && <Footer />}
    </>
  );
}
