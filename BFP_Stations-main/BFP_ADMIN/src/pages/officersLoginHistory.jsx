import { useEffect, useState } from "react";
import "../style/officers.css";
import apiClient from "../utils/apiClient";

export default function OfficerLogInHistory() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOfficers() {
      try {
        setLoading(true);
        const res = await apiClient.get('/officers');
        if (!isMounted) return;
        setOfficers(res.data || []);
        setError(null);
      } catch (err) {
        console.error('Failed to load officers:', err);
        if (isMounted) setError('Failed to load officers');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOfficers();

    return () => { isMounted = false; };
  }, []);

  return (
    <div className="officer-log-page">
      <h1 className="officer-page-title">Officer Login History</h1>

      {/* SEARCH + FILTERS (static controls for now) */}
      <div className="officer-search-card">
        <input type="text" placeholder="Search Officer Name..." className="officer-search-input" />

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

      <div className="officer-table-card">
        {loading ? (
          <div style={{ padding: 20 }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: 20, color: 'red' }}>{error}</div>
        ) : (
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
              {officers.map((officer) => (
                <tr key={officer.id}>
                  <td>{officer.last_login || '—'}</td>
                  <td>{officer.last_logout || '—'}</td>
                  <td>{officer.name}</td>
                  <td>{officer.rank}</td>
                  <td>
                    <span className={`officer-status-badge officer-status-${(officer.status||'offline').toLowerCase()}`}>
                      {officer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
