import { Link, useNavigate } from "react-router-dom";
import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import "../style/auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [stations, setStations] = useState([]);
  const [formData, setFormData] = useState({
    stationId: "",
    idNumber: "",
    password: ""
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Fetch real fire stations from DB on mount
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const res = await fetch(`${apiUrl}/stations`);
        if (res.ok) {
          const data = await res.json();
          setStations(data.stations || []);
        } else {
          console.error("Failed to fetch stations:", res.status);
        }
      } catch (err) {
        console.error("Failed to fetch stations:", err);
      }
    };
    fetchStations();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.stationId) {
      newErrors.stationId = "Substation is required";
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    if (loginError) {
      setLoginError("");
    }
  };

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
        // Validate: user must be substation_admin and assigned to the selected station
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.role !== 'substation_admin') {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          setLoginError("Only substation admin users can access this portal.");
          return;
        }
        if (user && String(user.assignedStationId) !== formData.stationId) {
          const correctStation = stations.find(s => s.station_id === user.assignedStationId);
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          setLoginError(
            correctStation
              ? `Your account is assigned to "${correctStation.station_name}". Please select the correct station.`
              : "Your account is not assigned to the selected station."
          );
          return;
        }
        navigate("/");
      } else {
        const errMsg = result.error || "Login failed. Please try again.";
        setLoginError(errMsg);
        if (errMsg.toLowerCase().includes('id number') || errMsg.toLowerCase().includes('badge')) {
          setErrors(prev => ({ ...prev, idNumber: errMsg }));
        } else if (errMsg.toLowerCase().includes('password')) {
          setErrors(prev => ({ ...prev, password: errMsg }));
        }
      }
    } catch (error) {
      setLoginError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Find station name for display
  const selectedStation = stations.find(s => String(s.station_id) === formData.stationId);

  return (
    <div className="login-page">
    <div className="login-container">
      <div className="login-left">
        <div className="login-left-content">
          <h1 className="login-left-title">Welcome back to BFP Admin Portal</h1>
          <p className="login-left-subtitle">Secure access to fire incident management system</p>
          
          <div className="login-features">
            <h3>How does it work?</h3>
            <ul>
              <li>Select your assigned BFP substation</li>
              <li>Enter your ID number and password</li>
              <li>Access your dashboard instantly</li>
            </ul>
          </div>
          
          <div className="login-footer">
            <p>Powered by BFP IT Department</p>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Let's get started</h1>
            <p className="login-sub">Sign in to your account</p>
          </div>

          {loginError && (
            <div className="auth-error">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>

            <div className="auth-group">
              <label>BFP Substation</label>
              <select 
                name="stationId"
                value={formData.stationId}
                onChange={handleInputChange}
                className={errors.stationId ? "error" : ""}
              >
                <option value="">-- Select Substation --</option>
                {stations.map(s => (
                  <option key={s.station_id} value={s.station_id}>
                    {s.station_name} {s.station_type ? `(${s.station_type})` : ''}
                  </option>
                ))}
              </select>
              {errors.stationId && (
                <span className="error-message">{errors.stationId}</span>
              )}
            </div>

            <div className="auth-group">
              <label>ID Number</label>
              <input 
                name="idNumber"
                value={formData.idNumber}
                onChange={handleInputChange}
                placeholder="Enter your ID (e.g., BFP-01234)" 
                className={errors.idNumber ? "error" : ""}
              />
             
            </div>

            <div className="auth-group">
              <label>Password</label>
              <input 
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password" 
                className={errors.password ? "error" : ""}
              />
              
            </div>

            <button className="login-btn" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Log-in"}
            </button>
          </form>

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