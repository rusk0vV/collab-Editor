import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../lib/api';

/**
 * AuthPage restyled to match front.md design guidelines.
 * Features tabs, full button-click bindings (no <form> tag), and error shake.
 */
export function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const navigate = useNavigate();

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleAuthSubmit = async () => {
    setError(null);
    setShakeError(false);

    // Validate inputs
    if (!email || !password || (isRegister && !name)) {
      setError('Please fill in all required fields');
      setShakeError(true);
      return;
    }

    setLoading(true);

    const path = isRegister ? '/auth/register' : '/auth/login';
    const payload = isRegister ? { email, name, password } : { email, password };

    try {
      const response = await request(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Save token and user info
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Navigate to main dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
      // Trigger horizontal shake animation on inputs
      setShakeError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass">
        {/* Geometric logo mark */}
        <div className="logo-mark">C</div>

        <h1>collab-Editor</h1>
        <p className="subtitle">Write together, in real time</p>

        {/* Tab switcher */}
        <div className="auth-tab-switch">
          <button
            type="button"
            className={!isRegister ? 'active' : ''}
            onClick={() => { setIsRegister(false); setError(null); setShakeError(false); }}
          >
            Log in
          </button>
          <button
            type="button"
            className={isRegister ? 'active' : ''}
            onClick={() => { setIsRegister(true); setError(null); setShakeError(false); }}
          >
            Register
          </button>
        </div>

        {/* Inputs list - no <form> tag used per guide */}
        <div className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && <div className="error-alert">{error}</div>}

          {isRegister && (
            <div className="form-group">
              <label htmlFor="name-input">Name</label>
              <input
                id="name-input"
                type="text"
                className={shakeError ? 'text-input shake-error' : 'text-input'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ali"
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email-input">Email</label>
            <input
              id="email-input"
              type="email"
              className={shakeError ? 'text-input shake-error' : 'text-input'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              type="password"
              className={shakeError ? 'text-input shake-error' : 'text-input'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="button"
            className="primary-btn"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
            onClick={handleAuthSubmit}
          >
            {loading ? (
              <span className="flex-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', animationDuration: '0.8s' }}></span>
                Processing...
              </span>
            ) : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
