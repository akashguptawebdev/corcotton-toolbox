import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { login, verifyTwoFactor } from './authSlice';
import Button from '@components/ui/Button/Button';
import styles from './LoginPage.module.scss';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, pendingTwoFactor } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await dispatch(login({ email, password }));
    setSubmitting(false);
    if (login.fulfilled.match(result) && !result.payload.requires2FA) {
      navigate(redirectTo, { replace: true });
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await dispatch(verifyTwoFactor(code));
    setSubmitting(false);
    if (verifyTwoFactor.fulfilled.match(result)) {
      navigate(redirectTo, { replace: true });
    }
  };

  if (pendingTwoFactor) {
    return (
      <form onSubmit={handleVerify2FA} className={styles.form}>
        <h1 className={styles.title}>Two-factor verification</h1>
        <p className={styles.subtitle}>Enter the 6-digit code from your authenticator app.</p>
        <label className={styles.field}>
          <span>Verification code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            required
          />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit" loading={submitting || status === 'checking'} className={styles.submit}>
          Verify
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className={styles.form}>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.subtitle}>Welcome back — manage your store from here.</p>
      <label className={styles.field}>
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" loading={submitting} className={styles.submit}>
        Sign in
      </Button>
    </form>
  );
};

export default LoginPage;
