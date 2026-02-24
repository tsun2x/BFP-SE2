import { Link, useNavigate } from "react-router-dom";
import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "../style/auth.css"; // Make sure this file exists

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    idNumber: "",
    password: ""
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Form validation
  const validateForm = () => {
    const newErrors = {};

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

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    if (loginError) setLoginError("");
  };

  // Login submit
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
        const user = JSON.parse(localStorage.getItem("user"));
        if (user?.role !== "super_admin") {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          setLoginError("Only Super Admin can access the portal.");
          return;
        }

        navigate("/admin-dashboard");
      } else {
        setLoginError(result.error || "Login failed. Please try again.");
      }
    } catch (error) {
      setLoginError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">

        {/* LEFT SIDE */}
        <div className="admin-left">
          <div className="admin-left-content">
            <h1 className="admin-title">BFP Super Admin Portal</h1>
            <h2 className="admin-station">Zamboanga Central Fire Station</h2>
            <p className="admin-sub">Headquarters Management System Access</p>

            <div className="admin-features">
              <h3>Portal Access</h3>
              <ul>
                <li>Manage all substations</li>
                <li>Monitor incidents system-wide</li>
                <li>Control user permissions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="admin-right">
          <div className="admin-card">
            <h2>Super Admin Login</h2>

            {loginError && <div className="admin-error">{loginError}</div>}

            <form onSubmit={handleLogin}>
              <div className="admin-group">
                <label>ID Number</label>
                <input
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  placeholder="BFP-01234"
                  className={errors.idNumber ? "input-error" : ""}
                />
                {errors.idNumber && (
                  <span className="error-message">{errors.idNumber}</span>
                )}
              </div>

              <div className="admin-group">
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
                  <span className="error-message">{errors.password}</span>
                )}
              </div>

              <button
                type="submit"
                className="admin-btn"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Access Super Admin"}
              </button>

              {/* SIGN-UP LINK */}
              <div className="admin-bottom">
                <span>Don't have an account?</span>
                <Link to="/signup">Sign Up</Link>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}