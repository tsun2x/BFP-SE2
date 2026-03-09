
import "../style/officers.css";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import apiClient from "../utils/apiClient";

export default function OfficerLogInHistory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterRank, setFilterRank] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStationId, setFilterStationId] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const json = await apiClient.get('/officer-login-history');
        setData(json?.data || []);
      } catch (e) {
        setData([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [user?.assignedStationId, user?.assigned_station_id, user?.role]);

  // Apply filters to the raw data first
  const filtered = data.filter((row) => {
    // Search by officer full name
    if (searchTerm) {
      const name = (row.users?.full_name || '').toLowerCase();
      if (!name.includes(searchTerm.toLowerCase())) return false;
    }

    // Filter by date (compare yyyy-mm-dd)
    if (filterDate) {
      const login = row.login_time ? new Date(row.login_time) : null;
      if (!login) return false;
      const loginDate = login.toISOString().slice(0, 10);
      if (loginDate !== filterDate) return false;
    }

    // Filter by rank
    if (filterRank) {
      const rank = row.users?.rank || '';
      if (String(rank) !== String(filterRank)) return false;
    }

    // Filter by status (case-insensitive)
    if (filterStatus) {
      const status = (row.status || '').toLowerCase();
      if (status !== filterStatus.toLowerCase()) return false;
    }

    // Filter by station id
    if (filterStationId) {
      if (String(row.station_id) !== String(filterStationId)) return false;
    }

    return true;
  });

  const groupedByStation = filtered.reduce((acc, row) => {
    const key = row.station_id ?? "unassigned";
    if (!acc[key]) {
      acc[key] = {
        station_id: row.station_id ?? null,
        station_name: row.fire_stations?.station_name ?? null,
        rows: [],
      };
    }
    acc[key].rows.push(row);
    return acc;
  }, {});

  const stationGroups = Object.values(groupedByStation).sort((a, b) => {
    const aName = a.station_name ?? "";
    const bName = b.station_name ?? "";
    
    // Put ZAMBOANGA CENTRAL FIRE STATION first
    const aIsCentral = aName.toLowerCase().includes("zamboanga") && aName.toLowerCase().includes("central");
    const bIsCentral = bName.toLowerCase().includes("zamboanga") && bName.toLowerCase().includes("central");
    
    if (aIsCentral && !bIsCentral) return -1;
    if (!aIsCentral && bIsCentral) return 1;
    
    // Then sort alphabetically
    if (aName && bName) return aName.localeCompare(bName);
    if (aName) return -1;
    if (bName) return 1;
    return String(a.station_id ?? "").localeCompare(String(b.station_id ?? ""));
  });

  // derive dropdown options from the raw data
  const rankOptions = Array.from(new Set(data.map((r) => r.users?.rank).filter(Boolean)));
  const statusOptions = Array.from(new Set(data.map((r) => r.status).filter(Boolean)));
  const stationOptions = Array.from(new Map(data.map((r) => [String(r.station_id ?? 'unassigned'), { station_id: r.station_id ?? null, station_name: r.fire_stations?.station_name ?? 'Unassigned' }])).values());

  return (
    <div className="officer-log-page">
      <h1 className="officer-page-title">Officer Login History</h1>

      {/* SEARCH + FILTERS */}
      <div className="officer-search-card">
        <div className="search-input-wrapper">
          <i className="fa-solid fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search Officer Name..."
            className="officer-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* FILTERS */}
        <div className="officer-filters">
          <div className="officer-filter-group">
            <label>Date</label>
            <input
              type="date"
              className="officer-filter-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="officer-filter-group">
            <label>Rank</label>
            <select
              className="officer-filter-input"
              value={filterRank}
              onChange={(e) => setFilterRank(e.target.value)}
            >
              <option value="">All</option>
              {rankOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="officer-filter-group">
            <label>Status</label>
            <select
              className="officer-filter-input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="officer-filter-group">
            <label>Firestation</label>
            <select
              className="officer-filter-input"
              value={filterStationId}
              onChange={(e) => setFilterStationId(e.target.value)}
            >
              <option value="">All</option>
              {stationOptions.map((s) => (
                <option key={String(s.station_id ?? 'unassigned')} value={String(s.station_id ?? '')}>{s.station_name || `Station ${s.station_id}`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="officer-table-card">
          <div>Loading...</div>
        </div>
      ) : (
        <div>
          {stationGroups.map((group) => (
            <div key={group.station_id ?? "unassigned"} className="station-container">
              <div className="station-header-label">
                {group.station_name || "UNASSIGNED STATION"}
              </div>

              <div className="station-table-container">
                <table className="officer-table">
                  <thead>
                    <tr className="table-header-row">
                      <th>Login Time</th>
                      <th>Logout Time</th>
                      <th>Name</th>
                      <th>Rank</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((officer) => (
                      <tr key={officer.id} className="table-data-row">
                        <td>{officer.login_time ? new Date(officer.login_time).toLocaleString() : "—"}</td>
                        <td>{officer.logout_time ? new Date(officer.logout_time).toLocaleString() : "—"}</td>
                        <td>{officer.users?.full_name || "—"}</td>
                        <td>{officer.users?.rank || "—"}</td>
                        <td>
                          <span
                            className={`officer-status-badge officer-status-${(officer.status || "").toLowerCase()}`}
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
          ))}
        </div>
      )}
    </div>
  );
}
