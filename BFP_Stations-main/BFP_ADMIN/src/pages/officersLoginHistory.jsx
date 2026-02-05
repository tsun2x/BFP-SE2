import "../style/officers.css";

export default function OfficerLogInHistory() {
  const data = [
    {
      id: 1,
      login: "2025-01-12 14:32",
      logout: null,
      name: "Juan Dela Cruz",
      rank: "Fire Officer 1",
      status: "Online",
    },
    {
      id: 2,
      login: "2025-01-12 14:10",
      logout: "2025-01-12 14:55",
      name: "Maria Santos",
      rank: "Senior Fire Officer 2",
      status: "Offline",
    },
    {
      id: 3,
      login: "2025-01-12 13:50",
      logout: "2025-01-12 14:20",
      name: "Carlos Reyes",
      rank: "Fire Officer 2",
      status: "Offline",
    },
  ];

  return (
    <div className="officer-log-page">
      <h1 className="officer-page-title">Officer Login History</h1>

      {/* SEARCH + FILTERS */}
      <div className="officer-search-card">

        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search Officer Name..."
          className="officer-search-input"
        />

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
            {data.map((officer) => (
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
