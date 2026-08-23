import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  HelpCircle,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { toggleTheme } from '@app/uiSlice';
import { googleLogin, login, sendLoginOtp, verifyLoginOtp, verifyTwoFactor } from './authSlice';
import Button from '@components/ui/Button/Button';
import loginModel from '@assets/images/toolbox-login-model.jpg';
import styles from './LoginPage.module.scss';

const OTP_LENGTH = 6;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@corcotton.com';

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
// Loose "looks like a phone number" check — real eligibility (does an admin account
// with this number exist?) is enforced server-side, same as the email path.
const isPhone = (value) => /^[\d\s+-]{8,15}$/.test(String(value || '').trim());
const DEFAULT_COUNTRY_CODE = '+91';

// Same convention as the storefront (corcotton-store's authService.js CHANNEL_BY_TYPE):
// the client decides EMAIL vs WHATSAPP from what the admin typed, and sends it explicitly.
const identifierChannel = (value) => (isEmail(value) ? 'EMAIL' : 'WHATSAPP');

const OtpFields = ({ value, onChange, disabled }) => {
  const refs = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] || '');

  const updateDigit = (index, input) => {
    const next = input.replace(/\D/g, '');
    if (next.length > 1) {
      const merged = `${value.slice(0, index)}${next}${value.slice(index + next.length)}`.slice(0, OTP_LENGTH);
      onChange(merged);
      refs.current[Math.min(index + next.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    const values = [...digits];
    values[index] = next;
    onChange(values.join(''));
    if (next && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className={styles.otpGrid} aria-label="Six digit verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus();
          }}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          aria-label={`Verification digit ${index + 1}`}
        />
      ))}
    </div>
  );
};

const BrandPanel = () => (
  <aside className={styles.brandPanel}>
    <img className={styles.brandImage} src={loginModel} alt="" />
    <div className={styles.brandShade} />
    <div className={styles.brandTop}>
      <span className={styles.logoMark}>S</span>
      <span className={styles.logoText}>corcotton</span>
    </div>
    <div className={styles.brandCopy}>
      <p className={styles.brandName}>CORCOTTON</p>
      <p className={styles.toolbox}>TOOLBOX</p>
      <p className={styles.welcome}>Welcome back!</p>
      <p className={styles.brandLine}>Sign in to access your store, manage orders and more.</p>
    </div>
    <div className={styles.brandStats}>
      <div>
        <BarChart3 size={21} />
        <span>Manage Orders Easily</span>
      </div>
      <div>
        <BriefcaseBusiness size={21} />
        <span>Track Returns & Refunds</span>
      </div>
      <div>
        <UsersRound size={21} />
        <span>Grow Your Business</span>
      </div>
    </div>
  </aside>
);

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, pendingTwoFactor } = useSelector((state) => state.auth);
  const theme = useSelector((state) => state.ui.theme);
  const [mode, setMode] = useState('otp');
  const [identifier, setIdentifier] = useState('');
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpChannel, setOtpChannel] = useState('EMAIL');
  const [otp, setOtp] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [localMessage, setLocalMessage] = useState('');
  const [localTone, setLocalTone] = useState('info');

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const finishAuth = (result, matcher) => {
    if (matcher(result)) navigate(redirectTo, { replace: true });
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    const raw = identifier.trim();
    const channel = identifierChannel(raw);
    if (channel === 'WHATSAPP' && !isPhone(raw)) {
      setLocalTone('error');
      setLocalMessage('Enter your registered admin email or WhatsApp number.');
      return;
    }
    const normalized = channel === 'EMAIL' ? raw.toLowerCase() : raw;

    setLocalTone('info');
    setLocalMessage('');
    setSubmitting(true);
    const result = await dispatch(sendLoginOtp({ identifier: normalized, channel, countryCode: DEFAULT_COUNTRY_CODE }));
    setSubmitting(false);
    if (sendLoginOtp.fulfilled.match(result)) {
      setOtpIdentifier(result.payload.identifier || normalized);
      setOtpChannel(result.payload.channel || channel);
      setOtp('');
      setOtpSent(true);
      setCooldown(result.payload.remainingSeconds || 60);
      setLocalTone('info');
      setLocalMessage(
        result.payload.devOtp
          ? `Dev OTP: ${result.payload.devOtp}`
          : channel === 'WHATSAPP'
            ? 'OTP sent to your registered admin WhatsApp number.'
            : 'OTP sent to your registered admin email.'
      );
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setLocalTone('error');
      setLocalMessage('Enter the complete 6-digit OTP.');
      return;
    }

    setLocalTone('info');
    setLocalMessage('');
    setSubmitting(true);
    const result = await dispatch(
      verifyLoginOtp({ identifier: otpIdentifier, otp, channel: otpChannel, countryCode: DEFAULT_COUNTRY_CODE })
    );
    setSubmitting(false);
    finishAuth(result, verifyLoginOtp.fulfilled.match);
  };

  const handleResendOtp = async () => {
    if (cooldown || !otpIdentifier) return;
    setLocalMessage('');
    setSubmitting(true);
    const result = await dispatch(sendLoginOtp({ identifier: otpIdentifier, channel: otpChannel, countryCode: DEFAULT_COUNTRY_CODE }));
    setSubmitting(false);
    if (sendLoginOtp.fulfilled.match(result)) {
      setOtp('');
      setCooldown(result.payload.remainingSeconds || 60);
      setLocalTone('info');
      setLocalMessage(result.payload.devOtp ? `Dev OTP: ${result.payload.devOtp}` : 'A new OTP has been sent.');
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLocalMessage('');
    setSubmitting(true);
    const result = await dispatch(login({ email, password }));
    setSubmitting(false);
    if (login.fulfilled.match(result) && !result.payload.requires2FA) {
      navigate(redirectTo, { replace: true });
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setLocalTone('error');
      setLocalMessage('Google sign-in is unavailable right now.');
      return;
    }

    setLocalTone('info');
    setLocalMessage('');
    setSubmitting(true);
    const result = await dispatch(googleLogin(credentialResponse.credential));
    setSubmitting(false);
    finishAuth(result, googleLogin.fulfilled.match);
  };

  const handleVerify2FA = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await dispatch(verifyTwoFactor(code));
    setSubmitting(false);
    finishAuth(result, verifyTwoFactor.fulfilled.match);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setLocalMessage('');
    setLocalTone('info');
  };

  const activeError = error || (localTone === 'error' ? localMessage : '');
  const activeInfo = !error && localTone === 'info' ? localMessage : '';

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-label="CORCOTTON toolbox login">
        <BrandPanel />
        <section className={styles.authPanel}>
          <div className={styles.topActions}>
            <button type="button" className={styles.iconOnly} onClick={() => dispatch(toggleTheme())} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={23} strokeWidth={1.8} /> : <Moon size={23} strokeWidth={1.8} />}
            </button>
            <button type="button" className={styles.helpButton} onClick={() => { window.location.href = `mailto:${supportEmail}`; }}>
              <HelpCircle size={18} />
              Need Help?
            </button>
          </div>

          <div className={styles.formWrap}>
            <h1 className={styles.title}>{otpSent && mode === 'otp' ? 'Enter OTP' : 'Welcome back'}</h1>
            <p className={styles.subtitle}>
              {otpSent && mode === 'otp' ? `Code sent to ${otpIdentifier}` : 'Login to your admin account'}
            </p>

            {!pendingTwoFactor && (
              <div className={styles.tabs} role="tablist" aria-label="Login method">
                <button
                  type="button"
                  className={mode === 'otp' ? styles.activeTab : styles.tab}
                  onClick={() => switchMode('otp')}
                >
                  <Smartphone size={18} />
                  OTP Login
                </button>
                <button
                  type="button"
                  className={mode === 'password' ? styles.activeTab : styles.tab}
                  onClick={() => switchMode('password')}
                >
                  <LockKeyhole size={18} />
                  Password Login
                </button>
              </div>
            )}

            {pendingTwoFactor ? (
              <form onSubmit={handleVerify2FA} className={styles.form}>
                <label className={styles.field}>
                  <span>Verification Code</span>
                  <div className={styles.inputBox}>
                    <LockKeyhole size={20} />
                    <input
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      autoFocus
                      required
                    />
                  </div>
                </label>
                {activeError && <p className={styles.error}>{activeError}</p>}
                {activeInfo && <p className={styles.info}>{activeInfo}</p>}
                <Button type="submit" loading={submitting || status === 'checking'} className={styles.primaryButton}>
                  Verify
                </Button>
              </form>
            ) : mode === 'otp' && !otpSent ? (
              <form onSubmit={handleSendOtp} className={styles.form}>
                <label className={styles.field}>
                  <span>Email or Phone Number</span>
                  <div className={styles.inputBox}>
                    <UserRound size={20} />
                    <input
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="Enter your email or phone number"
                      autoFocus
                      required
                    />
                  </div>
                </label>
                {activeError && <p className={styles.error}>{activeError}</p>}
                {activeInfo && <p className={styles.info}>{activeInfo}</p>}
                <Button type="submit" loading={submitting} className={styles.primaryButton}>
                  Send OTP
                </Button>
                <p className={styles.helper}>We'll send a 6-digit OTP to your registered admin email or WhatsApp number.</p>
              </form>
            ) : mode === 'otp' ? (
              <form onSubmit={handleVerifyOtp} className={styles.form}>
                <button type="button" className={styles.backButton} onClick={() => setOtpSent(false)}>
                  <ChevronLeft size={17} />
                  {otpChannel === 'WHATSAPP' ? 'Change number' : 'Change email'}
                </button>
                <OtpFields value={otp} onChange={setOtp} disabled={submitting} />
                {activeError && <p className={styles.error}>{activeError}</p>}
                {activeInfo && <p className={styles.info}>{activeInfo}</p>}
                <Button type="submit" loading={submitting} className={styles.primaryButton}>
                  Verify & Login
                </Button>
                <button type="button" className={styles.resendButton} onClick={handleResendOtp} disabled={Boolean(cooldown) || submitting}>
                  {cooldown ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className={styles.form}>
                <label className={styles.field}>
                  <span>Admin Email</span>
                  <div className={styles.inputBox}>
                    <UserRound size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your admin email"
                      autoFocus
                      required
                    />
                  </div>
                </label>
                <label className={styles.field}>
                  <span>Password</span>
                  <div className={styles.inputBox}>
                    <LockKeyhole size={20} />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </label>
                {activeError && <p className={styles.error}>{activeError}</p>}
                {activeInfo && <p className={styles.info}>{activeInfo}</p>}
                <Button type="submit" loading={submitting} className={styles.primaryButton}>
                  Login
                </Button>
              </form>
            )}

            {!pendingTwoFactor && (
              <>
                <div className={styles.divider}>
                  <span>or</span>
                </div>

                {mode === 'otp' && !otpSent && (
                  <button type="button" className={styles.switchButton} onClick={() => switchMode('password')}>
                    <LockKeyhole size={19} />
                    <span>Use email and password instead</span>
                    <ArrowRight size={18} />
                  </button>
                )}

                <div className={styles.googleWrap}>
                  <button
                    type="button"
                    className={styles.googleButton}
                    disabled={submitting}
                    onClick={
                      googleClientId
                        ? undefined
                        : () => {
                            setLocalTone('error');
                            setLocalMessage('Google sign-in needs VITE_GOOGLE_CLIENT_ID in toolbox/.env.');
                          }
                    }
                  >
                    <span className={styles.googleMark}>G</span>
                    Continue with Google
                  </button>
                  {googleClientId && (
                    <span className={styles.googleOverlay}>
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        text="continue_with"
                        theme="outline"
                        size="large"
                        width="420"
                        onError={() => {
                          setLocalTone('error');
                          setLocalMessage('Google sign-in is unavailable right now.');
                        }}
                      />
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className={styles.securityNote}>
            <ShieldCheck size={18} />
            <span>Secure admin access</span>
            <small>Your data is protected with industry-standard security.</small>
          </div>
        </section>
      </section>
    </main>
  );
};

export default LoginPage;
