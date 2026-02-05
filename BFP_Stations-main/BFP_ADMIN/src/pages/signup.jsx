import { Link, useNavigate } from "react-router-dom";
import { useState, useContext } from "react";
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
      // Build payload with only basic user data
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        idNumber: formData.idNumber,
        rank: formData.rank,
        password: formData.password,
        role: formData.userType === 'Main' ? 'admin' : 'end_user'
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

            <div className="auth-row">
              <div className="auth-group">
                <label>User Type</label>
                <select 
                  name="userType"
                  value={formData.userType}
                  onChange={handleInputChange}
                  className={errors.userType ? "error" : ""}
                  disabled
                >
                  <option value="Main">Main Station Admin</option>
                </select>
                {errors.userType && (
                  <span className="error-message">{errors.userType}</span>
                )}
              </div>
            </div>

          <form onSubmit={handleSignup}>

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