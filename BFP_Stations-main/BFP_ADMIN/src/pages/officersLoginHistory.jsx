
import "../style/officers.css";
import React, { useEffect, useState } from "react";
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
    // Priority: Central Firestation first, then substations, then others alphabetically
    const aName = a.station_name ?? "";
    const bName = b.station_name ?? "";
    
    // Check if either is Central Firestation
    const aIsCentral = aName.toLowerCase().includes("central") || aName.toLowerCase().includes("main");
    const bIsCentral = bName.toLowerCase().includes("central") || bName.toLowerCase().includes("main");
    
    // Check if either is a substation
    const aIsSubstation = aName.toLowerCase().includes("substation");
    const bIsSubstation = bName.toLowerCase().includes("substation");
    
    // If one is central, it comes first
    if (aIsCentral && !bIsCentral) return -1;
    if (!aIsCentral && bIsCentral) return 1;
    
    // If one is substation and the other is not (but neither is central)
    if (aIsSubstation && !bIsSubstation) return -1;
    if (!aIsSubstation && bIsSubstation) return 1;
    
    // Otherwise, sort alphabetically within the same category
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

      {/* SEPARATOR BETWEEN SEARCH AND CONTENT */}
      <div className="search-content-separator">
        <div className="separator-line"></div>
      </div>

      {/* TABLE */}
      <div className="officer-table-container">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="stations-list">
            {stationGroups.map((group, index) => {
              const groupName = group.station_name || "Unassigned Station";
              const isCentral = groupName.toLowerCase().includes("central") || groupName.toLowerCase().includes("main");
              const isSubstation = groupName.toLowerCase().includes("substation");
              const prevGroup = stationGroups[index - 1];
              const prevGroupName = prevGroup?.station_name || "";
              const prevWasCentral = prevGroupName.toLowerCase().includes("central") || prevGroupName.toLowerCase().includes("main");
              
              return (
                <React.Fragment key={group.station_id ?? "unassigned"}>
                  {/* Add substation separator after central fire station */}
                  {prevWasCentral && !isCentral && (
                    <div className="station-separator">
                      <div className="separator-line"></div>
                      <div className="separator-text">SUBSTATIONS</div>
                      <div className="separator-line"></div>
                    </div>
                  )}
                  
                  <div className="station-container">
                    <div className="station-header">
                      <h3>
                        {group.station_name || "Unassigned Station"}
                        {group.station_name ? "" : group.station_id ? ` (Station ID: ${group.station_id})` : ""}
                      </h3>
                    </div>

                    <div className="station-table-wrapper">
                      <table className="officer-table">
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
                          {group.rows.map((officer) => (
                            <tr key={officer.id}>
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
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
