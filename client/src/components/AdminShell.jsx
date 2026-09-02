import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../api.js';
import Masthead from '../components/Masthead.jsx';

export default function AdminShell({ title, action, children }) {
  const navigate = useNavigate();

  function signOut() {
    auth.clear();
    navigate('/');
  }

  return (
    <>
      <Masthead />
      <main className="shell admin">
        <div className="admin-head">
          <h1>{title}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {action}
            <button type="button" className="btn btn-plain" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>

        <nav className="tabs">
          <NavLink to="/admin/jobs">Listings</NavLink>
          <NavLink to="/admin/applications">Applications</NavLink>
          <NavLink to="/admin/ads">Ads</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>
        </nav>

        {children}
      </main>
    </>
  );
}
