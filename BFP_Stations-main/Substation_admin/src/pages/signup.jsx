import { Link, useNavigate } from "react-router-dom";

import { useState, useContext, useEffect } from "react";

import { AuthContext } from "../context/AuthContext";

import "../style/sign-up.css";



export default function Signup() {

  const navigate = useNavigate();

  const { signup } = useContext(AuthContext);



  const [formData, setFormData] = useState({

    firstName: "",

    lastName: "",

    middleName: "",

    email: "",

    idNumber: "",

    rank: "",

    userType: "Substation",

    assignedStationId: "",

    password: "",

    confirmPassword: ""

  });



  const [stations, setStations] = useState([]);

  const [errors, setErrors] = useState({});

  const [isLoading, setIsLoading] = useState(false);

  const [signupError, setSignupError] = useState("");

  const [passwordStrength, setPasswordStrength] = useState(0);



  // OTP state

  const [otpSent, setOtpSent] = useState(false);

  const [otpCode, setOtpCode] = useState("");

  const [emailVerified, setEmailVerified] = useState(false);

  const [otpLoading, setOtpLoading] = useState(false);

  const [otpMessage, setOtpMessage] = useState("");



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

    

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";

    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";

    if (!formData.idNumber.trim()) newErrors.idNumber = "ID Number is required";

    else if (!/^BFP-\d{5,}$/.test(formData.idNumber)) newErrors.idNumber = "Invalid ID format (BFP-01234)";

    if (!formData.rank.trim()) newErrors.rank = "Rank is required";

    if (!formData.password) newErrors.password = "Password is required";

    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";

    else if (passwordStrength < 2) newErrors.password = "Password is too weak";

    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";

    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";



    if (!formData.assignedStationId) newErrors.assignedStationId = "Please select a station";



    // Require email verification

    if (!formData.email.trim()) {

      newErrors.email = "Email is required";

    } else if (!emailVerified) {

      newErrors.email = "Please verify your email with OTP";

    }



    return newErrors;

  };



  const handleInputChange = (e) => {

    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));



    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));

    if (signupError) setSignupError("");



    if (name === "password") setPasswordStrength(checkPasswordStrength(value));



    // Reset OTP state if email changes after OTP was sent

    if (name === "email") {

      setOtpSent(false);

      setEmailVerified(false);

      setOtpCode("");

      setOtpMessage("");

    }

  };



  const getApiUrl = () => import.meta.env.VITE_API_URL || "http://localhost:5000/api";



  const handleSendOtp = async () => {

    if (!formData.email.trim()) {

      setErrors(prev => ({ ...prev, email: "Email is required" }));

      return;

    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email)) {

      setErrors(prev => ({ ...prev, email: "Invalid email format" }));

      return;

    }



    setOtpLoading(true);

    setOtpMessage("");

    try {

      const apiUrl = getApiUrl();

      const res = await fetch(`${apiUrl}/send-email-otp`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ email: formData.email })

      });

      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {

        if (!res.ok) throw new Error('Failed to send OTP. Please try again.');

      }

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');

      setOtpSent(true);

      setOtpMessage("OTP sent! Check your email inbox.");

    } catch (err) {

      const msg = err.message || "Failed to send OTP";

      setOtpMessage(msg.includes('<') ? "Failed to send OTP. Please try again." : msg);

    } finally {

      setOtpLoading(false);

    }

  };



  const handleVerifyOtp = async () => {

    if (!otpCode.trim()) {

      setOtpMessage("Please enter the OTP code");

      return;

    }

    setOtpLoading(true);

    setOtpMessage("");

    try {

      const apiUrl = getApiUrl();

      const res = await fetch(`${apiUrl}/verify-email-otp`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ email: formData.email, otp: otpCode })

      });

      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {

        if (!res.ok) throw new Error('Verification failed. Please try again.');

      }

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Invalid or expired OTP');

      setEmailVerified(true);

      setOtpMessage("Email verified successfully!");

    } catch (err) {

      const msg = err.message || "Invalid or expired OTP";

      setOtpMessage(msg.includes('<') ? "Verification failed. Please try again." : msg);

    } finally {

      setOtpLoading(false);

    }

  };



  const fetchStations = async () => {

    try {

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      const res = await fetch(`${apiUrl}/stations?stationType=Substation`);

      if (res.ok) {

        const data = await res.json();

        setStations(data.stations || []);

      }

    } catch (err) {

      console.error("Failed to fetch stations:", err);

    }

  };



  useEffect(() => { fetchStations(); }, []);



  const getPasswordStrengthLabel = () => ["Very Weak","Weak","Fair","Good","Strong"][passwordStrength];

  const getPasswordStrengthColor = () => ["#dc3545","#fd7e14","#ffc107","#20c997","#28a745"][passwordStrength];



  const handleSignup = async (e) => {

    e.preventDefault();

    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }



    setIsLoading(true); setSignupError("");

    try {

      const payload = {

        firstName: formData.firstName,

        middleName: formData.middleName,

        lastName: formData.lastName,

        idNumber: formData.idNumber,

        rank: formData.rank,

        password: formData.password,

        email: formData.email,

        stationType: formData.userType,

        role: 'substation_admin',

        assignedStationId: formData.assignedStationId

      };



      const result = await signup(payload);

      if (result.success) navigate('/login');

      else setSignupError(result.error || 'Registration failed. Please try again.');

    } catch {

      setSignupError("Registration failed. Please try again.");

    } finally {

      setIsLoading(false);

    }

  };



  return (

    <div className="signup-container">

      <div className="signup-sidebar"></div>

      <div className="signup-wrapper">

        <div className="signup-card">

          <h1 className="signup-title">Substation Admin Sign-Up</h1>



          {signupError && <div className="auth-error">{signupError}</div>}



          <form onSubmit={handleSignup}>

            <div className="auth-row">

              <div className="auth-group">

                <label>User Type</label>

                <select name="userType" value={formData.userType} disabled className="disabled-input">

                  <option value="Substation">Substation Admin</option>

                </select>

              </div>



              <div className="auth-group">

                <label>Assigned Station</label>

                <select

                  name="assignedStationId"

                  value={formData.assignedStationId}

                  onChange={handleInputChange}

                  className={errors.assignedStationId ? "error" : ""}

                >

                  <option value="">-- Select Station --</option>

                  {stations.map(s => <option key={s.station_id} value={s.station_id}>{s.station_name}</option>)}

                </select>

                {errors.assignedStationId && <span className="error-message">{errors.assignedStationId}</span>}

              </div>

            </div>



            <h2 className="section-title">Personal Information</h2>



            <div className="auth-row three-columns">

              <div className="auth-group">

                <label>First Name</label>

                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First Name" className={errors.firstName ? "error" : ""} />

                {errors.firstName && <span className="error-message">{errors.firstName}</span>}

              </div>



              <div className="auth-group">

                <label>Middle Name</label>

                <input type="text" name="middleName" value={formData.middleName} onChange={handleInputChange} placeholder="Middle Name" className={errors.middleName ? "error" : ""} />

                {errors.middleName && <span className="error-message">{errors.middleName}</span>}

              </div>



              <div className="auth-group">

                <label>Last Name</label>

                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last Name" className={errors.lastName ? "error" : ""} />

                {errors.lastName && <span className="error-message">{errors.lastName}</span>}

              </div>

            </div>



            <div className="auth-row two-columns">

              <div className="auth-group">

                <label>ID Number</label>

                <input type="text" name="idNumber" value={formData.idNumber} onChange={handleInputChange} placeholder="BFP-01234" className={errors.idNumber ? "error" : ""} />

                {errors.idNumber && <span className="error-message">{errors.idNumber}</span>}

              </div>



              <div className="auth-group">

                <label>Email {emailVerified && <span style={{ color: '#28a745' }}>✓ Verified</span>}</label>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email" className={errors.email ? "error" : ""} disabled={emailVerified} style={{ flex: 1 }} />

                  {!emailVerified && (

                    <button type="button" onClick={handleSendOtp} disabled={otpLoading || !formData.email} className="otp-btn">

                      {otpLoading ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}

                    </button>

                  )}

                </div>

                {errors.email && <span className="error-message">{errors.email}</span>}

                {otpSent && !emailVerified && (

                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>

                    <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6} style={{ flex: 1 }} />

                    <button type="button" onClick={handleVerifyOtp} disabled={otpLoading || !otpCode} className="otp-btn">

                      {otpLoading ? "Verifying..." : "Verify"}

                    </button>

                  </div>

                )}

                {otpMessage && (

                  <span style={{ fontSize: '13px', color: emailVerified ? '#28a745' : '#dc3545', marginTop: '6px', display: 'block' }}>

                    {otpMessage}

                  </span>

                )}

              </div>

            </div>



            <div className="auth-row single-column">

              <div className="auth-group">

                <label>Rank</label>

                <input type="text" name="rank" value={formData.rank} onChange={handleInputChange} placeholder="Fire Officer 1" className={errors.rank ? "error" : ""} />

                {errors.rank && <span className="error-message">{errors.rank}</span>}

              </div>

            </div>



            <h2 className="section-title">Login Credentials</h2>



            <div className="auth-row">

              <div className="auth-group">

                <label>Password</label>

                <input type="password" name="password" value={formData.password} onChange={handleInputChange} className={errors.password ? "error" : ""} />

                {formData.password && (

                  <div className="password-strength">

                    <div className="strength-bar">

                      <div className="strength-fill" style={{ width: `${(passwordStrength/4)*100}%`, backgroundColor: getPasswordStrengthColor() }}></div>

                    </div>

                    <span className="strength-text" style={{ color: getPasswordStrengthColor() }}>{getPasswordStrengthLabel()}</span>

                  </div>

                )}

                {errors.password && <span className="error-message">{errors.password}</span>}

              </div>



              <div className="auth-group">

                <label>Confirm Password</label>

                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className={errors.confirmPassword ? "error" : ""} />

                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}

              </div>

            </div>



            <div className="signup-buttons">

              <button type="button" className="reset-btn" onClick={() => { setFormData({ userType: "Substation", firstName: "", lastName: "", middleName: "", email: "", idNumber: "", rank: "", password: "", confirmPassword: "", assignedStationId: "" }); setOtpSent(false); setOtpCode(""); setEmailVerified(false); setOtpMessage(""); setErrors({}); setSignupError(""); }}>

                Reset

              </button>

              <button type="submit" className="continue-btn" disabled={isLoading}>{isLoading ? "Creating Account..." : "Sign Up"}</button>

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