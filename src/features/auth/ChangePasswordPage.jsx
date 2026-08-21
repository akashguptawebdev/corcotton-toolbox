import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { changePassword } from './authSlice';
import Button from '@components/ui/Button/Button';
import styles from './LoginPage.module.scss';

// Reached right after a first login with a temp password (ProtectedRoute redirects here
// whenever user.mustChangePassword is true) — no sidebar/nav chrome, same standalone card
// as LoginPage (rendered inside AuthLayout). currentPassword is the temp password the
// user was just emailed / just typed to log in with a moment ago.
const ChangePasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { error } = useSelector((state) => state.auth);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (newPassword.length < 8) {
      setFormError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setFormError('New password must be different from your current password.');
      return;
    }

    setSubmitting(true);
    const result = await dispatch(changePassword({ currentPassword, newPassword }));
    setSubmitting(false);
    if (changePassword.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h1 className={styles.title}>Set a new password</h1>
      <p className={styles.subtitle}>For security, you need to replace your temporary password before continuing.</p>

      <label className={styles.field}>
        <span>Temporary password</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoFocus
          required
        />
      </label>

      <label className={styles.field}>
        <span>New password</span>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
        />
      </label>

      <label className={styles.field}>
        <span>Confirm new password</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={8}
          required
        />
      </label>

      {(formError || error) && <p className={styles.error}>{formError || error}</p>}

      <Button type="submit" loading={submitting} className={styles.submit}>
        Change password &amp; continue
      </Button>
    </form>
  );
};

export default ChangePasswordPage;
