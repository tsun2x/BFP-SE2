import { Link, useNavigate } from "react-router-dom";
import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import "../style/auth.css";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    idNumber: "",
    rank: "",
    userType: "Main",
    assignedStationId: "",
    password: "",
    confirmPassword: ""
  });
  const [stations, setStations] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

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
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    }
    
    if (!formData.idNumber.trim()) {
      newErrors.idNumber = "ID Number is required";
    } else if (!/^BFP-\d{5,}$/.test(formData.idNumber)) {
      newErrors.idNumber = "Invalid ID format (e.g., BFP-01234)";
    }
    
    if (!formData.rank.trim()) {
      newErrors.rank = "Rank is required";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (passwordStrength < 2) {
      newErrors.password = "Password is too weak";
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    // ensure assigned station selected for Main admin
    if (!formData.assignedStationId) {
      newErrors.assignedStationId = 'Please select assigned station';
    }
    
    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    // Clear signup error when user makes changes
    if (signupError) {
      setSignupError("");
    }
    
    // Check password strength
    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const fetchStations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/stations`);
      if (res.ok) {
        const data = await res.json();
        const list = data.stations || [];
        setStations(list);
      } else {
        console.error('Failed to fetch stations', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch stations', err);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const getPasswordStrengthLabel = () => {
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    return labels[passwordStrength];
  };

  const getPasswordStrengthColor = () => {
    const colors = ["#dc3545", "#fd7e14", "#ffc107", "#20c997", "#28a745"];
    return colors[passwordStrength];
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setSignupError("");
    
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        idNumber: formData.idNumber,
        rank: formData.rank,
        assignedStationId: formData.assignedStationId,
        password: formData.password,
        role: 'admin'
      };

      const result = await signup(payload);
      
      if (result.success) {
        // Redirect to login after successful signup
        navigate("/login", { state: { message: "Account created successfully. Please login." } });
      } else {
        setSignupError(result.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setSignupError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      
      <div className="signup-sidebar">
      </div>

      <div className="signup-wrapper">

        <div className="signup-card">

          <div className="signup-header">
            <h1 className="signup-title">Basic Details</h1>
          </div>

          {signupError && (
            <div className="auth-error">
              {signupError}
            </div>
          )}

          <form onSubmit={handleSignup}>

            <div className="auth-row">
              <div className="auth-group">
                <label>Assigned Station</label>
                <select
                  name="assignedStationId"
                  value={formData.assignedStationId}
                  onChange={handleInputChange}
                  className={errors.assignedStationId ? 'error' : ''}
                >
                  <option value="">-- Select Station --</option>
                  {stations.map(s => (
                    <option key={s.station_id} value={s.station_id}>{s.station_name}</option>
                  ))}
                </select>
                {errors.assignedStationId && (
                  <span className="error-message">{errors.assignedStationId}</span>
                )}
              </div>
            </div>

            <h2 className="section-title">Personal Information</h2>

            <div className="auth-row">
              <div className="auth-group">
                <label>First Name</label>
                <input 
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required 
                  placeholder="Enter first name" 
                  className={errors.firstName ? "error" : ""}
                />
                {errors.firstName && (
                  <span className="error-message">{errors.firstName}</span>
                )}
              </div>

              <div className="auth-group">
                <label>Last Name</label>
                <input 
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required 
                  placeholder="Enter last name" 
                  className={errors.lastName ? "error" : ""}
                />
                {errors.lastName && (
                  <span className="error-message">{errors.lastName}</span>
                )}
              </div>
            </div>
            
            <div className="auth-row">
              <div className="auth-group">
                <label>ID Number</label>
                <input 
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  required 
                  placeholder="BFP-01234" 
                  className={errors.idNumber ? "error" : ""}
                />
                {errors.idNumber && (
                  <span className="error-message">{errors.idNumber}</span>
                )}
              </div>

              <div className="auth-group">
                <label>Rank</label>
                <input 
                  type="text"
                  name="rank"
                  value={formData.rank}
                  onChange={handleInputChange}
                  placeholder="Fire Officer 1" 
                  required 
                  className={errors.rank ? "error" : ""}
                />
                {errors.rank && (
                  <span className="error-message">{errors.rank}</span>
                )}
              </div>
            </div>

            <h2 className="section-title">Login Credentials</h2>

            <div className="auth-row">
              <div className="auth-group">
                <label>Password</label>
                <input 
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required 
                  className={errors.password ? "error" : ""}
                />
                {formData.password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className="strength-fill" 
                        style={{ 
                          width: `${(passwordStrength / 4) * 100}%`,
                          backgroundColor: getPasswordStrengthColor()
                        }}
                      ></div>
                    </div>
                    <span className="strength-text" style={{ color: getPasswordStrengthColor() }}>
                      {getPasswordStrengthLabel()}
                    </span>
                  </div>
                )}
                {errors.password && (
                  <span className="error-message">{errors.password}</span>
                )}
              </div>

              <div className="auth-group">
                <label>Confirm Password</label>
                <input 
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required 
                  className={errors.confirmPassword ? "error" : ""}
                />
                {errors.confirmPassword && (
                  <span className="error-message">{errors.confirmPassword}</span>
                )}
              </div>
            </div>

            <div className="signup-buttons">
              <button type="button" className="reset-btn" onClick={() => {
                setFormData({
                  firstName: "",
                  lastName: "",
                  idNumber: "",
                  rank: "",
                  userType: "Main",
                  assignedStationId: "",
                  password: "",
                  confirmPassword: ""
                });
                setErrors({});
                setSignupError("");
              }}>
                Reset All
              </button>
              <button type="submit" className="continue-btn" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Sign Up"}
              </button>
            </div>

          </form>

          <div className="auth-bottom">
            <span>Already have an account?</span>
            <Link to="/login">Login</Link>
          </div>

        </div>

      </div>

    </div>
  );
}