import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../api.js';
import Masthead from '../components/Masthead.jsx';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const { token } = await api.login(email, password);
      auth.set(token);
      navigate('/admin/jobs');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Masthead />
      <main className="shell">
        <div className="login">
          <div className="card">
            <h2>Sign in to manage listings</h2>

            {error && (
              <div className="notice notice-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="btn btn-dark" disabled={busy} style={{ width: '100%' }}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
