import { Link, NavLink } from 'react-router-dom';
import { auth } from '../api.js';
import { useSite } from '../useSite.js';

/** The dark header used on every public page. */
export default function Masthead({ children }) {
  const { siteName } = useSite();

  return (
    <header className="masthead">
      <div className="shell">
        <div className="masthead-bar">
          <Link to="/" className="wordmark">
            <span aria-hidden="true" />
            {siteName}
          </Link>
          <nav className="masthead-links">
            <NavLink to="/jobs">Jobs</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to={auth.get() ? '/admin/jobs' : '/admin'}>Employers</NavLink>
          </nav>
        </div>
        {children}
      </div>
    </header>
  );
}
