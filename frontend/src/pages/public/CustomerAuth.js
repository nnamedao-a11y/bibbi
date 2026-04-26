/**
 * Customer Auth Context and Login Page
 * 
 * Emergent Google OAuth (1-click)
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */

import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useLang } from '../../i18n';
import BibiLogo from '../../components/public/BibiLogo';
import LanguageSwitcher from '../../components/public/LanguageSwitcher';
import CabinetThemeToggle from '../../components/cabinet/CabinetThemeToggle';
import {
  User,
  Lock,
  Envelope,
  Eye,
  EyeSlash,
  ArrowLeft,
  Warning,
  SpinnerGap,
  GoogleLogo,
} from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// ============ AUTH CONTEXT ============

const CustomerAuthContext = createContext(null);

export const useCustomerAuth = () => useContext(CustomerAuthContext);

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check
    // AuthCallback will exchange the session_id and establish the session first
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First, check if we have a session token in localStorage
      const savedSession = localStorage.getItem('customer_session');
      let sessionToken = null;
      let savedCustomerData = null;
      
      if (savedSession) {
        try {
          savedCustomerData = JSON.parse(savedSession);
          sessionToken = savedCustomerData?.sessionToken;
        } catch {}
      }
      
      // If we have a sessionToken, verify it and use it
      if (sessionToken) {
        try {
          const res = await axios.get(`${API_URL}/api/customer-auth/google/me`, {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
            withCredentials: true,
          });
          const customerData = res.data;
          setCustomer(customerData);
          // Update localStorage with fresh data but keep sessionToken
          localStorage.setItem('customer_session', JSON.stringify({
            ...customerData,
            sessionToken: customerData.sessionToken || sessionToken,
          }));
          return; // Successfully authenticated
        } catch (err) {
          // Session token invalid/expired - clear it
          console.log('Session token invalid, clearing');
          localStorage.removeItem('customer_session');
        }
      }
      
      // Try legacy JWT token
      const token = localStorage.getItem('customer_token');
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/api/customer-auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const customerData = res.data;
          setCustomer(customerData);
          // Save to localStorage
          if (customerData?.customerId) {
            localStorage.setItem('customer_session', JSON.stringify(customerData));
          }
          return; // Successfully authenticated
        } catch {
          localStorage.removeItem('customer_token');
          localStorage.removeItem('customer_session');
        }
      }
      
      // No valid auth found - user needs to login
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  // Emergent Google OAuth login
  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/cabinet/auth/callback';
    console.log('[Auth] Redirecting to Google OAuth:', redirectUrl);
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  // Process Emergent OAuth callback
  const processGoogleCallback = async (sessionId) => {
    console.log('[Auth] Processing Google callback with sessionId:', sessionId);
    const res = await axios.post(`${API_URL}/api/customer-auth/google/session`, 
      { sessionId },
      { withCredentials: true }
    );
    const customerData = res.data;
    console.log('[Auth] Google session response:', {
      customerId: customerData?.customerId,
      hasSessionToken: !!customerData?.sessionToken,
      sessionToken: customerData?.sessionToken?.substring(0, 20) + '...',
    });
    setCustomer(customerData);
    // Save to localStorage for session persistence - include sessionToken for auth headers
    if (customerData?.customerId) {
      const dataToSave = {
        ...customerData,
        sessionToken: customerData.sessionToken,
      };
      console.log('[Auth] Saving to localStorage:', {
        customerId: dataToSave.customerId,
        hasSessionToken: !!dataToSave.sessionToken,
      });
      localStorage.setItem('customer_session', JSON.stringify(dataToSave));
    }
    return customerData;
  };

  // Legacy email/password login
  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/api/customer-auth/login`, {
      email,
      password
    });
    const customerData = res.data;
    localStorage.setItem('customer_token', customerData.accessToken);
    localStorage.setItem('customer_session', JSON.stringify(customerData));
    setCustomer(customerData);
    return customerData;
  };

  // Legacy register
  const register = async (email, password, name) => {
    const res = await axios.post(`${API_URL}/api/customer-auth/register`, {
      email,
      password,
      name,
      customerId: ''
    });
    const customerData = res.data;
    localStorage.setItem('customer_token', customerData.accessToken);
    localStorage.setItem('customer_session', JSON.stringify(customerData));
    setCustomer(customerData);
    return customerData;
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/customer-auth/google/logout`, {}, {
        withCredentials: true
      });
    } catch {}
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_session');
    setCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider value={{ 
      customer, 
      loading, 
      login, 
      register, 
      logout, 
      loginWithGoogle,
      processGoogleCallback,
      checkAuth
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

// ============ PROTECTED ROUTE ============

export const CustomerProtectedRoute = ({ children }) => {
  const { customer, loading } = useCustomerAuth();
  const location = useLocation();

  // If user data passed from AuthCallback, render immediately
  if (location.state?.user) {
    return children;
  }

  if (loading) {
    return (
      <div className="public-theme min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <SpinnerGap size={40} className="animate-spin text-[#FEAE00]" />
          <span className="text-[12px] uppercase tracking-[0.18em] text-white/50">loading</span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/cabinet/login" replace />;
  }

  return children;
};

// ============ AUTH CALLBACK (Emergent OAuth) ============

export const AuthCallback = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const { processGoogleCallback } = useCustomerAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const sessionIdMatch = hash.match(/session_id=([^&]+)/);
    
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1];
      
      processGoogleCallback(sessionId)
        .then((data) => {
          // Navigate to cabinet with user data
          navigate(`/cabinet/${data.customerId}`, { 
            replace: true,
            state: { user: data }
          });
        })
        .catch((err) => {
          console.error('Auth callback error:', err);
          navigate('/cabinet/login', { replace: true });
        });
    } else {
      navigate('/cabinet/login', { replace: true });
    }
  }, []);

  return (
    <div className="public-theme min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(600px 420px at 50% 40%, rgba(254,174,0,0.12) 0%, rgba(0,0,0,0) 70%)',
        }}
      />
      <div className="relative text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FEAE00]/10 border border-[#FEAE00]/30 mx-auto mb-5 flex items-center justify-center">
          <SpinnerGap size={28} className="animate-spin text-[#FEAE00]" />
        </div>
        <p className="text-white text-[15px] font-semibold tracking-wide">{t('authorizing')}</p>
        <p className="text-white/50 text-[12px] mt-1 uppercase tracking-[0.16em]">{t('secureLogin')}</p>
      </div>
    </div>
  );
};

// ============ LOGIN PAGE ============

export const CustomerLoginPage = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const { customer, loginWithGoogle } = useCustomerAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = useCustomerAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (customer?.customerId) {
      navigate(`/cabinet/${customer.customerId}`);
    }
  }, [customer, navigate]);

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await auth.login(email, password);
        navigate(`/cabinet/${data.customerId}`);
      } else {
        const data = await auth.register(email, password, name);
        navigate(`/cabinet/${data.customerId}`);
      }
    } catch (err) {
      const detail = err.response?.data?.message || err.response?.data?.detail || err.message;
      setError(typeof detail === 'string' ? detail : t('authError'));
    } finally {
      setLoading(false);
    }
  };

  const title = isLogin ? t('welcomeBack') : t('createAccount');
  const subtitle = isLogin ? t('signInSubtitle') : t('signUpSubtitle');

  // Shared input class (dark theme, high contrast)
  const inputBase =
    'w-full h-[52px] pl-11 pr-4 bg-[#0F0F0D] border border-[#3A3A37] rounded-md text-[15px] font-medium text-white placeholder:text-[#6A6A66] outline-none transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_0_rgba(0,0,0,0.4)] focus:border-[#FEAE00] focus:ring-2 focus:ring-[#FEAE00]/35 focus:shadow-[0_0_0_4px_rgba(254,174,0,0.18),inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#55544E]';

  return (
    <div
      className="public-theme min-h-screen bg-black relative overflow-hidden flex flex-col"
      data-testid="customer-login-page"
    >
      {/* Ambient background accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(700px 480px at 12% -10%, rgba(254,174,0,0.14) 0%, rgba(0,0,0,0) 55%),' +
            'radial-gradient(620px 420px at 95% 110%, rgba(254,174,0,0.10) 0%, rgba(0,0,0,0) 60%)',
        }}
      />
      {/* Subtle dotted texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='1'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* Top bar: logo (left) + theme + language switcher (right) */}
      <div className="relative z-10 flex items-center justify-between px-6 xl:px-12 pt-6 lg:pt-8">
        <BibiLogo height={40} />
        <div className="flex items-center gap-2.5">
          <CabinetThemeToggle variant="compact" />
          <LanguageSwitcher variant="floating" />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10 lg:py-14">
        <div className="w-full max-w-[440px]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-[32px] lg:text-[40px] leading-[1.05] font-extrabold tracking-tight text-white"
              style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
            >
              {title}
            </h1>
            <p className="text-[14px] lg:text-[15px] text-white/75 mt-3 max-w-[380px] mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-[#FEAE00]/25 bg-[#1D1D1B] shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(254,174,0,0.08),inset_0_1px_0_rgba(255,255,255,0.04)] p-6 sm:p-8">
            {/* Error alert */}
            {error && (
              <div
                className="mb-5 p-3 rounded-md bg-[#3A1212] border border-[#5B1B1B] flex items-start gap-2.5"
                role="alert"
                data-testid="auth-error"
              >
                <Warning size={18} className="text-[#FF6B6B] mt-[1px] flex-shrink-0" />
                <span className="text-[13px] text-[#FFCACA] leading-snug">{error}</span>
              </div>
            )}

            {/* Google Auth Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full h-[54px] bg-white hover:bg-[#F4F4F4] active:bg-[#E9E9E9] text-[#1D1D1B] rounded-md font-semibold text-[14px] transition-all flex items-center justify-center gap-3 shadow-[0_4px_14px_-2px_rgba(255,255,255,0.10)]"
              data-testid="google-login-btn"
            >
              <GoogleLogo size={22} weight="bold" className="text-[#4285F4]" />
              {t('continueWithGoogle')}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3A3A37]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-[#1D1D1B] text-[11px] uppercase tracking-[0.22em] text-white/60 font-semibold">
                  {t('or')}
                </span>
              </div>
            </div>

            {/* Email toggle / Form */}
            {!showEmailForm ? (
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full h-[54px] rounded-md border border-[#3A3A37] bg-[#0F0F0D] hover:border-[#FEAE00] hover:bg-[#171614] hover:shadow-[0_0_0_3px_rgba(254,174,0,0.18)] text-white font-semibold text-[14px] transition-all flex items-center justify-center gap-3"
                data-testid="show-email-form-btn"
              >
                <Envelope size={18} className="text-[#FEAE00]" />
                {t('loginWithEmail')}
              </button>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-5" data-testid="email-auth-form">
                {!isLogin && (
                  <div>
                    <label className="block text-[12px] font-bold text-[#FEAE00] mb-2 uppercase tracking-[0.12em]">
                      {t('yourName')}
                    </label>
                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FEAE00]/80"
                      />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('namePlaceholder')}
                        className={inputBase}
                        data-testid="register-name-input"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[12px] font-bold text-[#FEAE00] mb-2 uppercase tracking-[0.12em]">
                    {t('emailLabel')}
                  </label>
                  <div className="relative">
                    <Envelope
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FEAE00]/80"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className={inputBase}
                      data-testid="login-email-input"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[12px] font-bold text-[#FEAE00] uppercase tracking-[0.12em]">
                      {t('password')}
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        className="text-[11px] text-white/70 hover:text-[#FEAE00] font-medium transition-colors"
                        tabIndex={-1}
                      >
                        {t('forgotPassword')}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FEAE00]/80"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className={`${inputBase} pr-11`}
                      data-testid="login-password-input"
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-[#FEAE00] transition-colors p-1"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {!isLogin && (
                    <p className="mt-1.5 text-[11px] text-white/55">{t('passwordMinHint')}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[54px] mt-2 bg-[#FEAE00] hover:bg-[#FFBF2D] active:bg-[#E89D00] text-black rounded-md font-extrabold text-[14px] tracking-[0.06em] uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_8px_30px_-4px_rgba(254,174,0,0.65),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  data-testid="login-submit-btn"
                >
                  {loading ? (
                    <>
                      <SpinnerGap size={18} className="animate-spin" />
                      {t('loading')}
                    </>
                  ) : isLogin ? (
                    t('signInCta')
                  ) : (
                    t('signUpCta')
                  )}
                </button>
              </form>
            )}

            {/* Toggle login/register */}
            {showEmailForm && (
              <div className="mt-6 text-center text-[13px]">
                <span className="text-white/70">
                  {isLogin ? t('noAccount') : t('haveAccount')}
                </span>
                <button
                  onClick={() => {
                    setIsLogin((v) => !v);
                    setError('');
                  }}
                  className="ml-2 text-[#FEAE00] font-bold hover:underline underline-offset-4"
                  data-testid="toggle-auth-mode-btn"
                >
                  {isLogin ? t('register') : t('login')}
                </button>
              </div>
            )}
          </div>

          {/* Legal + Back link */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-[11px] text-white/50 leading-relaxed px-4">
              {t('legalNotice')}{' '}
              <a href="/terms" className="text-white/75 hover:text-[#FEAE00] underline underline-offset-2">
                {t('terms')}
              </a>{' '}
              {t('and')}{' '}
              <a href="/privacy" className="text-white/75 hover:text-[#FEAE00] underline underline-offset-2">
                {t('privacy')}
              </a>
              .
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.14em] text-white/75 hover:text-[#FEAE00] transition-colors"
              data-testid="back-to-site-link"
            >
              <ArrowLeft size={14} />
              {t('backToSite')}
            </Link>
          </div>
        </div>
      </div>

      {/* Footer trust strip */}
      <div className="relative z-10 border-t border-[#1A1A18] bg-black/40">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/35 uppercase tracking-[0.14em]">
          <span>© {new Date().getFullYear()} BIBI CARS</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FEAE00] shadow-[0_0_8px_rgba(254,174,0,0.8)]" />
            {t('secureLogin')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CustomerLoginPage;

