import "../style/officers.css";
import { useEffect, useMemo, useState } from "react";
import apiClient from "../utils/apiClient";

export default function OfficerLogInHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const data = useMemo(() => {
    return (rows || []).map((r) => ({
      id: r.id,
      login: r.login_time ? new Date(r.login_time).toLocaleString() : "—",
      logout: r.logout_time ? new Date(r.logout_time).toLocaleString() : null,
      name: r.users?.full_name || "—",
      rank: r.users?.rank || "—",
      status: r.status || "—",
    }));
  }, [rows]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const json = await apiClient.get('/officer-login-history');
        const list = Array.isArray(json?.data) ? json.data : [];
        if (!mounted) return;
        setRows(list);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load login history');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="officer-log-page">
      <h1 className="officer-page-title">Officer Login History</h1>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {/* SEARCH + FILTERS */}
      <div className="officer-search-card">

        {/* SEARCH */}
        <div className="officer-search-wrapper">
          <span className="officer-search-icon">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search Officer Name..."
            className="officer-search-input"
          />
        </div>

        {/* FILTERS */}
        <div className="officer-filters">

          <div className="officer-filter-group">
            <label>Date</label>
            <input type="date" className="officer-filter-input" />
          </div>

          <div className="officer-filter-group">
            <label>Rank</label>
            <select className="officer-filter-input">
              <option value="">All</option>
              <option>Fire Officer 1</option>
              <option>Fire Officer 2</option>
              <option>Senior Fire Officer 1</option>
              <option>Senior Fire Officer 2</option>
            </select>
          </div>

          <div className="officer-filter-group">
            <label>Status</label>
            <select className="officer-filter-input">
              <option value="">All</option>
              <option>Online</option>
              <option>Offline</option>
            </select>
          </div>

        </div>
      </div>

      {/* TABLE */}
      <div className="officer-table-card">
        <table>
          <thead>
            <tr>
              <th>Login Time</th>
              <th>Logout Time</th>
              <th>Name</th>
              <th>Rank</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Loading...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5}>No login history found</td>
              </tr>
            ) : data.map((officer) => (
              <tr key={officer.id}>
                <td>{officer.login}</td>
                <td>{officer.logout ? officer.logout : "—"}</td>
                <td>{officer.name}</td>
                <td>{officer.rank}</td>

                <td>
                  <span
                    className={`officer-status-badge officer-status-${officer.status.toLowerCase()}`}
                  >
                    {officer.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
