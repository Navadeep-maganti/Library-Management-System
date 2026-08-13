import React, { useState } from 'react';

const LoginPage = () => {
  const [role, setRole] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!identifier.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }

    const loginPayload = {
      role,
      password,
      ...(role === 'student' ? { student_roll_no: identifier } : { email: identifier })
    };

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      setSuccessMessage(data.message || 'Login successful.');
      console.log('Authentication payload generated:', loginPayload);
      console.log('Server response:', data);
    } catch (err) {
      setError(err.message || 'Something went wrong while logging in.');
    }
  };

  const getIdentifierLabel = () => {
    if (role === 'student') return 'Student Email Address';
    if (role === 'librarian') return 'Librarian Email Address';
    return 'Admin Email Address';
  };

  const getIdentifierPlaceholder = () => {
    if (role === 'student') return 'e.g., STU12345';
    return 'e.g., name@library.com';
  };

  return (
    <div style={styles.pageShell}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <p style={styles.cardTag}>LIBRARY MANAGEMENT SYSTEM</p>
          <h2 style={styles.title}>Sign in to your account</h2>
          <p style={styles.subtitle}>Choose your role, complete your details, and verify securely.</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            {/* Dynamic Role Selection Bar from Figma Layout */}
            <div style={styles.toggleGroup}>
              <button
                type="button"
                onClick={() => {
                  setRole('student');
                  setIdentifier('');
                }}
                style={role === 'student' ? { ...styles.toggleButton, ...styles.toggleButtonActive } : styles.toggleButton}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('librarian');
                  setIdentifier('');
                }}
                style={role === 'librarian' ? { ...styles.toggleButton, ...styles.toggleButtonActive } : styles.toggleButton}
              >
                Librarian
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>{getIdentifierLabel()}</label>
            <input
              type={role === 'student' ? 'text' : 'email'}
              placeholder={getIdentifierPlaceholder()}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
              <a
                href="#forgot-password"
                onClick={() => alert('Routing client to account recovery endpoint...')}
                style={styles.link}
              >
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.button}>
            Submit Login
          </button>
        </form>

        <div style={styles.footer}>
          <span>Need access? </span>
          <a
            href="#register"
            onClick={() => alert(`Routing client to registration portal for role: ${role}`)}
            style={styles.registerLink}
          >
            Register as {role.charAt(0).toUpperCase() + role.slice(1)}
          </a>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageShell: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #E3F6F5 0%, #C4EDEC 100%)',
    fontFamily: 'Inter, "Segoe UI", sans-serif',
    padding: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px', 
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)',
    border: '1px solid #E2E8F0',
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  cardTag: {
    margin: '0 0 8px 0',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    color: '#006A6D',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1A2D32',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#718096',
    lineHeight: '1.5',
  },
  errorBanner: {
    backgroundColor: '#FFF5F5',
    color: '#C53030',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid #FED7D7',
  },
  successBanner: {
    backgroundColor: '#F0FFF4',
    color: '#22543D',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid #C6F6D5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    alignItems: 'stretch',
  },
  toggleGroup: {
    display: 'flex',
    backgroundColor: '#E6F4F4',
    borderRadius: '30px',
    padding: '4px',
    marginBottom: '10px',
    width: '100%',
  },
  toggleButton: {
    flex: 1,
    padding: '10px 20px',
    borderRadius: '30px',
    border: 'none',
    background: 'transparent',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#4A5568',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toggleButtonActive: {
    background: '#16A34A',
    color: '#ffffff',
    boxShadow: '0 6px 16px rgba(22, 163, 74, 0.25)',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'left',
    width: '100%',
    marginBottom: '2px',
    display: 'block',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #CBD5E0',
    fontSize: '0.95rem',
    color: '#2D3748',
    outline: 'none',
    backgroundColor: '#F8FAFC',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  button: {
    background: 'linear-gradient(180deg, #008084 0%, #006A6D 100%)',
    color: '#ffffff',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 2px 4px rgba(0, 106, 109, 0.2)',
  },
  link: {
    fontSize: '0.8rem',
    color: '#006A6D',
    textDecoration: 'none',
    fontWeight: '500',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#4A5568',
  },
  registerLink: {
    color: '#006A6D',
    textDecoration: 'none',
    fontWeight: '600',
  }
};

export default LoginPage;
