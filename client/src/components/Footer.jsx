import { Link } from 'react-router-dom';
import { useSite } from '../useSite.js';

const GROUPS = [
  {
    heading: 'Find work',
    links: [
      { to: '/jobs', label: 'Browse all jobs' },
      { to: '/jobs?work_mode=remote', label: 'Remote roles' },
      { to: '/jobs?employment=internship', label: 'Internships' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About us' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy policy' },
      { to: '/cookies', label: 'Cookie policy' },
      { to: '/terms', label: 'Terms of use' },
    ],
  },
];

export default function Footer() {
  const { siteName, companyName, contactEmail, contactAddress } = useSite();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Link to="/" className="wordmark wordmark-dark">
            <span aria-hidden="true" />
            {siteName}
          </Link>
          <p>Open roles, read by people rather than filters.</p>
          {contactEmail && (
            <p>
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
          )}
          {contactAddress && <p className="footer-address">{contactAddress}</p>}
        </div>

        {GROUPS.map((group) => (
          <nav key={group.heading} className="footer-group" aria-label={group.heading}>
            <h2>{group.heading}</h2>
            <ul>
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="shell footer-base">
        <span>
          © {year} {companyName || siteName}. All rights reserved.
        </span>
        <Link to="/admin">Employer sign in</Link>
      </div>
    </footer>
  );
}
