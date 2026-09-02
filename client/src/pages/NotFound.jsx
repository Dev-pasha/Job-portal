import { Link } from 'react-router-dom';
import Masthead from '../components/Masthead.jsx';

export default function NotFound() {
  return (
    <>
      <Masthead />
      <main className="shell board">
        <div className="empty">
          <h3>That page does not exist</h3>
          <p>The link may be out of date, or the role may have been taken down.</p>
          <p style={{ marginTop: 18 }}>
            <Link to="/jobs" className="btn btn-dark">
              Browse open roles
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
