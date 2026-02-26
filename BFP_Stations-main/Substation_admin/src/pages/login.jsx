import { Link, useNavigate } from "react-router-dom";
import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "../style/auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    substation: "",
    idNumber: "",
    password: ""
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.substation) {
      newErrors.substation = "Substation is required";
    }

    if (!formData.idNumber.trim()) {
      newErrors.idNumber = "ID Number is required";
    } else if (!/^BFP-\d{5,}$/.test(formData.idNumber)) {
      newErrors.idNumber = "Invalid ID format (e.g., BFP-01234)";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    return newErrors;
  };

  /* ================= INPUT HANDLER ================= */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear individual error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }

    if (loginError) {
      setLoginError("");
    }
  };

  /* ================= LOGIN HANDLER ================= */
  const handleLogin = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setLoginError("");

    try {
      const result = await login(formData.idNumber, formData.password);

      if (result.success) {
        navigate("/");
      } else {
        setLoginError(result.error || "Login failed. Please try again.");
      }
    } catch (error) {
      setLoginError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="login-page">
      <div className="login-container">

        {/* LEFT PANEL */}
        <div className="login-left">
          <div className="login-left-content">
            <h1 className="login-left-title">
              Welcome back to <br /> BFP Admin Portal
            </h1>

            <p className="login-left-subtitle">
              Secure access to fire incident management system
            </p>

            <div className="login-features">
              <h3>How does it work?</h3>
              <ul>
                <li>Select your BFP substation</li>
                <li>Enter your ID number and password</li>
                <li>Access your dashboard instantly</li>
              </ul>
            </div>

            <div className="login-footer">
              Powered by BFP IT Department
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="login-right">
          <div className="login-card">

            <div className="login-header">
              <h2 className="login-title">Let’s get started</h2>
              <p className="login-sub">Sign-in to your account</p>
            </div>

            {loginError && (
              <div className="auth-error">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} noValidate>

              {/* SUBSTATION */}
              <div className="auth-group">
                <label>BFP Substation</label>
                <select
                  name="substation"
                  value={formData.substation}
                  onChange={handleInputChange}
                  className={errors.substation ? "input-error" : ""}
                >
                  <option value="">Select Substation</option>
                  <option value="zamboanga">
                    BFP Zamboanga City Station
                  </option>
                </select>
                {errors.substation && (
                  <span className="error-message">
                    {errors.substation}
                  </span>
                )}
              </div>

              {/* ID NUMBER */}
              <div className="auth-group">
                <label>ID Number</label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  placeholder="Enter your ID (e.g., BFP-01234)"
                  className={errors.idNumber ? "input-error" : ""}
                />
                {errors.idNumber && (
                  <span className="error-message">
                    {errors.idNumber}
                  </span>
                )}
              </div>

              {/* PASSWORD */}
              <div className="auth-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  className={errors.password ? "input-error" : ""}
                />
                {errors.password && (
                  <span className="error-message">
                    {errors.password}
                  </span>
                )}
              </div>

              {/* BUTTON */}
              <button
                type="submit"
                className="login-btn"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Log-in"}
              </button>

            </form>

            {/* BOTTOM */}
            <div className="auth-bottom">
              <span>Don't have an account?</span>
              <Link to="/signup">Sign Up</Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}