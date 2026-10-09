import React, { useState } from 'react';
import './form1.css';
import bgImage from './assets/b220baad708ae4b56bab929e70f211256ed23c7520a44f18e711712356effe9b.png';

const Form1 = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    agreeTerms: true
  });
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(isLogin ? `Logging in with ${formData.email}` : `Account created for ${formData.fullName || formData.email}!`);
  };

  return (
    <div 
      className="glass-scene-wrapper" 
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Optional ambient backdrop overlay for depth */}
      <div className="bg-overlay" aria-hidden="true"></div>

      {/* Main Frosted Glassmorphism Card */}
      <main className="glass-card">
        <div className="glass-card-inner">
          
          {/* Left Column: Form Section */}
          <section className="form-section">
            <header className="form-header">
              <h1 className="form-title">
                <span>{isLogin ? 'Welcome' : 'Join the'}</span>
                <span>{isLogin ? 'Back' : 'Future'}</span>
              </h1>
              {/* Dual color accent underline capsule */}
              <div className="accent-bar-wrap" aria-hidden="true">
                <span className="accent-bar-pink"></span>
                <span className="accent-bar-cyan"></span>
              </div>
            </header>

            <form className="auth-form" onSubmit={handleSubmit} noValidate autoComplete="off">
              {!isLogin && (
                <div className={`input-group ${focusedField === 'fullName' ? 'focused' : ''} ${formData.fullName ? 'has-value' : ''}`}>
                  <input
                    type="text"
                    id="field_fn"
                    name="val_entry_fn"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    readOnly
                    onFocus={(e) => {
                      e.target.removeAttribute('readonly');
                      setFocusedField('fullName');
                    }}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Full Name"
                    required
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    aria-autocomplete="none"
                  />
                  <div className="input-line"></div>
                </div>
              )}

              <div className={`input-group ${focusedField === 'email' ? 'focused' : ''} ${formData.email ? 'has-value' : ''}`}>
                <input
                  type="text"
                  id="field_em"
                  name="val_entry_em"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  readOnly
                  onFocus={(e) => {
                    e.target.removeAttribute('readonly');
                    setFocusedField('email');
                  }}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Email"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  aria-autocomplete="none"
                />
                <div className="input-line"></div>
              </div>

              {/* Hidden dummy inputs to consume browser autofill heuristics */}
              <input type="text" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
              <input type="password" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />

              <div className={`input-group ${focusedField === 'password' ? 'focused' : ''} ${formData.password ? 'has-value' : ''}`}>
                <input
                  type="text"
                  id="field_pw"
                  className="password-masked-input"
                  name="val_entry_pw"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  readOnly
                  onFocus={(e) => {
                    e.target.removeAttribute('readonly');
                    setFocusedField('password');
                  }}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Password"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  aria-autocomplete="none"
                />
                <div className="input-line"></div>
              </div>

              {/* Password Status / Strength Indicator */}
              <div className="password-indicator" aria-hidden="true">
                <span className="indicator-dot"></span>
                <div className="indicator-track">
                  <div 
                    className="indicator-fill"
                    style={{
                      width: !formData.password 
                        ? '22%' 
                        : formData.password.length < 4 
                          ? '40%' 
                          : formData.password.length < 8 
                            ? '65%' 
                            : formData.password.length < 12 
                              ? '85%' 
                              : '100%'
                    }}
                  ></div>
                </div>
              </div>

              {/* Social Login Options */}
              <div className="social-row">
                <div className="social-brand-pill" title="Continue with">
                  <span className="brand-dot-green"></span>
                  <span className="brand-dot-pink"></span>
                  <span className="brand-name">continue with</span>
                </div>

                <div className="social-icons-group">
                  {/* Apple Icon */}
                  <button type="button" className="social-btn" aria-label="Sign in with Apple" title="Apple">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.13.65-2.79 1.43-.59.68-1.11 1.77-.97 2.83 1.08.08 2.15-.59 2.75-1.39z" />
                    </svg>
                  </button>

                  {/* Shield / Passkey Icon */}
                  <button type="button" className="social-btn" aria-label="Sign in with Passkey / Security Key" title="Security Passkey">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 4.14-2.73 8.01-6 9.08-3.27-1.07-6-4.94-6-9.08V6.43l6-2.25zM11 7v6h2V7h-2zm0 8v2h2v-2h-2z" />
                    </svg>
                  </button>

                  {/* GitHub Icon */}
                  <button type="button" className="social-btn" aria-label="Sign in with GitHub" title="GitHub">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <button type="submit" className="submit-btn">
                <span className="submit-text">{isLogin ? 'Sign in' : 'Sign up'}</span>
                <div className="btn-shine"></div>
              </button>

              {/* Terms Checkbox */}
              <label className="terms-checkbox">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                />
                <span className="custom-check">
                  <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2.5 7 5.5 10 11.5 3.5"></polyline>
                  </svg>
                </span>
                <span className="terms-text">I agree to the <span className="terms-highlight">Terms</span></span>
              </label>
            </form>
          </section>

          {/* Right Column: Glass Quote & Interactive Badges */}
          <section className="info-section">
            {/* Top Right "Welcome Back" Pill Toggle */}
            <div className="top-badge-container">
              <button 
                type="button" 
                className="welcome-back-badge"
                onClick={() => setIsLogin(!isLogin)}
                title={isLogin ? "Switch to Sign up" : "Switch to Login"}
              >
                <span className="welcome-text">{isLogin ? 'Create account' : 'Welcome back'}</span>
                <span className="lock-icon-circle">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </span>
              </button>
            </div>

            {/* Inner Glass Quote Card */}
            <article className="inner-quote-card">
              <div className="quote-content">
                <p className="quote-text">
                  “ Step into the future of seamless digital experiences. Create, connect, and elevate your workflow with next-generation tools designed for you. ”
                </p>
                <p className="quote-author">
                  <span className="author-slash">/</span> Next Generation Platform.
                </p>
              </div>
            </article>

            {/* Bottom Right "Secure & Encrypted" Badge */}
            <div className="bottom-badge-container">
              <div className="security-badge">
                <div className="security-icon-wrap">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 12l2 2 4-4"></path>
                  </svg>
                </div>
                <span className="security-text">Secure &amp; Encrypted</span>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default Form1;