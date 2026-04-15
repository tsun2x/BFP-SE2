import { Link, useNavigate } from 'react-router-dom';

import { useState, useContext, useEffect } from 'react';

import { AuthContext } from '../context/AuthContext';

import '../style/sign-up.css';

import apiClient from '../utils/apiClient';
import { API_BASE } from '../utils/runtimeConfig';

export default function Signup() {
  const navigate = useNavigate();

  const { signup } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    firstName: '',

    lastName: '',
    middleName: '',
    email: '',
    idNumber: '',
    rank: '',

    accountRole: 'substation_admin',

    assignedStationId: '',

    password: '',

    confirmPassword: '',
  });

  const [stations, setStations] = useState([]);

  const [errors, setErrors] = useState({});

  const [isLoading, setIsLoading] = useState(false);

  const [signupError, setSignupError] = useState('');

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP state

  const [otpSent, setOtpSent] = useState(false);

  const [otpCode, setOtpCode] = useState('');

  const [emailVerified, setEmailVerified] = useState(false);

  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0);

  useEffect(() => {
    if (otpCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setOtpCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldownSeconds]);

  const extractRetryAfterSeconds = (message) => {
    const match = String(message || '').match(/(\d+)\s*seconds?/i);
    if (match) return Number(match[1]);
    if (/rate\s*limit/i.test(String(message || ''))) return 60;
    return 0;
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;

    if (password.length >= 8) strength++;

    if (password.length >= 12) strength++;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;

    if (/\d/.test(password)) strength++;

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    return Math.min(strength, 4);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';

    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!formData.idNumber.trim()) newErrors.idNumber = 'ID Number is required';
    else if (!/^BFP-\d{5}$/.test(formData.idNumber))
      newErrors.idNumber = 'Invalid format. Use BFP- followed by 5 digits (e.g., BFP-01234)';

    if (!formData.rank.trim()) newErrors.rank = 'Rank is required';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';
    else if (passwordStrength < 2) newErrors.password = 'Password is too weak';

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    if (!formData.assignedStationId) newErrors.assignedStationId = 'Please select a station';

    // Require email verification

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailVerified) {
      newErrors.email = 'Please verify your email with OTP';
    }

    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));

    if (signupError) setSignupError('');

    if (name === 'password') setPasswordStrength(checkPasswordStrength(value));

    // Reset OTP state if email changes after OTP was sent

    if (name === 'email') {
      setOtpSent(false);

      setEmailVerified(false);

      setOtpCode('');

      setOtpMessage('');
      setOtpCooldownSeconds(0);
    }
  };

  const handleSendOtp = async () => {
    if (otpCooldownSeconds > 0) {
      setOtpMessage(`Please wait ${otpCooldownSeconds}s before requesting a new OTP.`);
      return;
    }

    if (!formData.email.trim()) {
      setErrors((prev) => ({ ...prev, email: 'Email is required' }));

      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email)) {
      setErrors((prev) => ({ ...prev, email: 'Invalid email format' }));

      return;
    }

    setOtpLoading(true);

    setOtpMessage('');

    try {
      await apiClient.post('/send-otp', { email: formData.email });

      setOtpSent(true);

      setOtpMessage('OTP sent! Check your email inbox.');
    } catch (err) {
      const msg = err.message || 'Failed to send OTP';
      const retrySeconds = extractRetryAfterSeconds(msg);
      if (retrySeconds > 0) {
        setOtpCooldownSeconds(retrySeconds);
      }

      setOtpMessage(msg.includes('<') ? 'Failed to send OTP. Please try again.' : msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setOtpMessage('Please enter the OTP code');

      return;
    }

    setOtpLoading(true);

    setOtpMessage('');

    try {
      await apiClient.post('/verify-otp', { email: formData.email, otp: otpCode });

      setEmailVerified(true);

      setOtpMessage('Email verified successfully!');
    } catch (err) {
      const msg = err.message || 'Invalid or expired OTP';

      setOtpMessage(msg.includes('<') ? 'Verification failed. Please try again.' : msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      const res = await fetch(`${API_BASE}/stations?stationType=Substation`);

      if (res.ok) {
        const data = await res.json();

        setStations(data.stations || []);
      }
    } catch (err) {
      console.error('Failed to fetch stations:', err);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const getPasswordStrengthLabel = () =>
    ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength];

  const getPasswordStrengthColor = () =>
    ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#28a745'][passwordStrength];

  const handleSignup = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setSignupError('');

    try {
      const payload = {
        firstName: formData.firstName,

        middleName: formData.middleName,

        lastName: formData.lastName,

        idNumber: formData.idNumber,

        rank: formData.rank,

        password: formData.password,

        email: formData.email,

        role: formData.accountRole,

        assignedStationId: formData.assignedStationId,
      };

      const result = await signup(payload);

      if (result.success) navigate('/login');
      else setSignupError(result.error || 'Registration failed. Please try again.');
    } catch {
      setSignupError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-sidebar"></div>

      <div className="signup-wrapper">
        <div className="signup-card">
          <h1 className="signup-title">Substation Portal Sign-Up</h1>

          {signupError && <div className="auth-error">{signupError}</div>}

          <form onSubmit={handleSignup}>
            <div className="auth-row">
              <div className="auth-group">
                <label>Role</label>

                <select
                  name="accountRole"
                  value={formData.accountRole}
                  onChange={handleInputChange}
                >
                  <option value="substation_admin">Substation Admin</option>
                  <option value="driver">Driver</option>
                </select>
              </div>

              <div className="auth-group">
                <label>Assigned Station</label>

                <select
                  name="assignedStationId"
                  value={formData.assignedStationId}
                  onChange={handleInputChange}
                  className={errors.assignedStationId ? 'error' : ''}
                >
                  <option value="">-- Select Station --</option>

                  {stations.map((s) => (
                    <option key={s.station_id} value={s.station_id}>
                      {s.station_name}
                    </option>
                  ))}
                </select>

                {errors.assignedStationId && (
                  <span className="error-message">{errors.assignedStationId}</span>
                )}
              </div>
            </div>

            <h2 className="section-title">Personal Information</h2>

            <div className="auth-row three-columns">
              <div className="auth-group">
                <label>First Name</label>

                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="First Name"
                  className={errors.firstName ? 'error' : ''}
                />

                {errors.firstName && <span className="error-message">{errors.firstName}</span>}
              </div>

              <div className="auth-group">
                <label>Middle Name</label>

                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  placeholder="Middle Name"
                  className={errors.middleName ? 'error' : ''}
                />

                {errors.middleName && <span className="error-message">{errors.middleName}</span>}
              </div>

              <div className="auth-group">
                <label>Last Name</label>

                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Last Name"
                  className={errors.lastName ? 'error' : ''}
                />

                {errors.lastName && <span className="error-message">{errors.lastName}</span>}
              </div>
            </div>

            <div className="auth-row two-columns">
              <div className="auth-group">
                <label>ID Number</label>

                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  placeholder="BFP-01234"
                  className={errors.idNumber ? 'error' : ''}
                />

                {errors.idNumber && <span className="error-message">{errors.idNumber}</span>}
              </div>

              <div className="auth-group">
                <label>
                  Email {emailVerified && <span style={{ color: '#28a745' }}>✓ Verified</span>}
                </label>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email"
                    className={errors.email ? 'error' : ''}
                    disabled={emailVerified}
                    style={{ flex: 1 }}
                  />

                  {!emailVerified && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading || !formData.email || otpCooldownSeconds > 0}
                      className="otp-btn"
                    >
                      {otpLoading
                        ? 'Sending...'
                        : otpCooldownSeconds > 0
                          ? `Retry in ${otpCooldownSeconds}s`
                          : otpSent
                            ? 'Resend OTP'
                            : 'Send OTP'}
                    </button>
                  )}
                </div>

                {errors.email && <span className="error-message">{errors.email}</span>}

                {otpSent && !emailVerified && (
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      style={{ flex: 1 }}
                    />

                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpLoading || !otpCode}
                      className="otp-btn"
                    >
                      {otpLoading ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                )}

                {otpMessage && (
                  <span
                    style={{
                      fontSize: '13px',
                      color: emailVerified ? '#28a745' : '#dc3545',
                      marginTop: '6px',
                      display: 'block',
                    }}
                  >
                    {otpMessage}
                  </span>
                )}
              </div>
            </div>

            <div className="auth-row single-column">
              <div className="auth-group">
                <label>Rank</label>

                <input
                  type="text"
                  name="rank"
                  value={formData.rank}
                  onChange={handleInputChange}
                  placeholder="Fire Officer 1"
                  className={errors.rank ? 'error' : ''}
                />

                {errors.rank && <span className="error-message">{errors.rank}</span>}
              </div>
            </div>

            <h2 className="section-title">Login Credentials</h2>

            <div className="auth-row">
              <div className="auth-group">
                <label>Password</label>

                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={errors.password ? 'error' : ''}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {formData.password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div
                        className="strength-fill"
                        style={{
                          width: `${(passwordStrength / 4) * 100}%`,
                          backgroundColor: getPasswordStrengthColor(),
                        }}
                      ></div>
                    </div>

                    <span className="strength-text" style={{ color: getPasswordStrengthColor() }}>
                      {getPasswordStrengthLabel()}
                    </span>
                  </div>
                )}

                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="auth-group">
                <label>Confirm Password</label>

                <div className="password-field">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={errors.confirmPassword ? 'error' : ''}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={
                      showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {errors.confirmPassword && (
                  <span className="error-message">{errors.confirmPassword}</span>
                )}
              </div>
            </div>

            <div className="signup-buttons">
              <button
                type="button"
                className="reset-btn"
                onClick={() => {
                  setFormData({
                    accountRole: 'substation_admin',
                    firstName: '',
                    lastName: '',
                    middleName: '',
                    email: '',
                    idNumber: '',
                    rank: '',
                    password: '',
                    confirmPassword: '',
                    assignedStationId: '',
                  });
                  setOtpSent(false);
                  setOtpCode('');
                  setEmailVerified(false);
                  setOtpMessage('');
                  setErrors({});
                  setSignupError('');
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
              >
                Reset
              </button>

              <button type="submit" className="continue-btn" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </div>
          </form>

          <div className="auth-bottom">
            <span>Already have an account?</span> <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
