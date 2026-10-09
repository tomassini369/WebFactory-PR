import React, { useState } from 'react';
import './form2.css';
import bgImage from './assets/2654d48f2ca8a9141fb311b2471cf7abe122b81f2c1e5808c45a7d7948ed2b13.png';

const Form2 = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: true
  });
  const [isSignUp, setIsSignUp] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(isSignUp ? `Account created for ${formData.username}!` : `Welcome back, ${formData.username || 'Traveler'}!`);
  };

  return (
    <div 
      className="form2-scene" 
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Subtle geometric wireframe shapes overlay */}
      <div className="wireframe-shapes" aria-hidden="true">
        {/* Top Left Circle */}
        <div className="wireframe-circle top-left-circle"></div>
        {/* Bottom Left Circle */}
        <div className="wireframe-circle bottom-left-circle"></div>
        {/* Top Right Triangle */}
        <div className="wireframe-triangle top-right-triangle">
          <svg viewBox="0 0 100 100">
            <polygon points="10,10 90,50 10,90" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="3" />
          </svg>
        </div>
        {/* Bottom Right Overlapping Rings */}
        <div className="wireframe-circle bottom-right-ring-1"></div>
        <div className="wireframe-circle bottom-right-ring-2"></div>
      </div>

      {/* Main Screen Container */}
      <div className="form2-container">
        
        {/* Left Hero Section: Welcome Typography */}
        <div className="hero-left-section">
          <div className="hero-text-wrapper">
            <h1 className="hero-welcome-title">Welcome</h1>
            <p className="hero-welcome-subtitle">Have a great journey ahead...</p>
          </div>

          {/* Bottom Left "Visit site" Pill Button */}
          <button 
            type="button" 
            className="visit-site-pill" 
            onClick={() => window.open('https://google.com', '_blank')}
            title="Visit site"
          >
            <span className="visit-arrow">↗</span>
            <span className="visit-text">Visit site</span>
          </button>
        </div>

        {/* Right Glassmorphism Login Card */}
        <div className="login-card-section">
          <main className="form2-glass-card">
            
            <form onSubmit={handleSubmit} noValidate autoComplete="off" className="form2-auth-form">
              
              {/* Hidden dummy inputs to block browser autofill heuristics */}
              <input type="text" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
              <input type="password" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />

              {/* Username Input Group */}
              <div className="form2-input-group">
                <label htmlFor="form2-username" className="form2-label">Username</label>
                <input
                  type="text"
                  id="form2_fld_u"
                  name="val_f2_u"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  placeholder="John Doe"
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
                  className="form2-pill-input"
                />
              </div>

              {/* Password Input Group */}
              <div className="form2-input-group">
                <label htmlFor="form2-password" className="form2-label">Password</label>
                <input
                  type="text"
                  id="form2_fld_p"
                  name="val_f2_p"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  placeholder="••••••••"
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
                  className="form2-pill-input form2-password-masked"
                />
              </div>

              {/* Remember Me Checkbox */}
              <div className="form2-options-row">
                <label className="form2-remember-checkbox">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <span className="form2-custom-check">
                    <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2.5 7 5.5 10 11.5 3.5"></polyline>
                    </svg>
                  </span>
                  <span className="form2-remember-text">Remember me</span>
                </label>
              </div>

              {/* Sign In CTA Button */}
              <button type="submit" className="form2-submit-btn">
                <span>{isSignUp ? 'SIGN UP' : 'SIGN IN'}</span>
              </button>

              {/* Footer Account Links */}
              <div className="form2-footer-links">
                <p className="form2-switch-mode">
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                  <button 
                    type="button" 
                    className="form2-link-btn"
                    onClick={() => setIsSignUp(!isSignUp)}
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </button>
                </p>

                <button 
                  type="button" 
                  className="form2-forgot-link"
                  onClick={() => alert('Password reset link sent to registered email.')}
                >
                  Forgot Password
                </button>
              </div>

            </form>

          </main>
        </div>

      </div>
    </div>
  );
};

export default Form2;