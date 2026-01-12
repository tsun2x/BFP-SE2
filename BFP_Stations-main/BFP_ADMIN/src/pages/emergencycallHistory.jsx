import { useState } from "react";
import IncidentDetailsPanel from "../components/incidentdetailspanel";
import "../style/callHistory.css";

export default function EmergencyCallHistory() {
  const [calls, setCalls] = useState([
    {
      id: "c1",
      callerId: "u123",
      caller: "Juan Dela Cruz",
      number: "+63 912 345 6789",
      location: "Purok 2, Brgy. San Isidro",
      type: "Electrical Fire",
      alarm: "Alarm 2 — Reinforcement Needed",
      narrative: "Fire started in kitchen area. Smoke visible.",
      status: "Pending",
      timeline: [{ status: "Pending", time: new Date().toISOString() }],
      datetime: "2025-11-19 01:10",
    },
    {
      id: "c2",
      callerId: "u124",
      caller: "Maria Santos",
      number: "+63 912 555 0000",
      location: "Blk 4 Lot 7, Example City",
      type: "Medical Emergency",
      alarm: "Alarm 0 — Normal",
      narrative: "Unconscious person, breathing.",
      status: "Dispatch On the Way",
      timeline: [
        { status: "Pending", time: new Date().toISOString() },
        { status: "Dispatch On the Way", time: new Date().toISOString() },
      ],
      datetime: "2025-11-18 22:40",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Open right-side panel
  const openPanel = (call) => {
    setSelected(call);
    setPanelOpen(true);
  };

  // Close right-side panel
  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelected(null), 200);
  };

  // Update status from panel
  const handleStatusChange = (newStatus, updatedIncident) => {
    setCalls((prev) =>
      prev.map((item) =>
        item.id === updatedIncident.id
          ? { ...item, status: newStatus }
          : item
      )
    );
  };

  // Search
  const filteredCalls = calls.filter((c) =>
    c.caller.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Status Badge UI Mapping
  const getStatusBadgeClass = (status) => {
    const key = status.toLowerCase().replace(/\s/g, "-");

    return {
      "pending": "status-yellow",
      "dispatch-on-the-way": "status-blue",
      "resolved": "status-green",
      "cancelled": "status-red",
    }[key] || "status-default";
  };

  return (
    <div className="call-page">
      <h1 className="call-title">Emergency Call History</h1>

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
        </div>
      </div>

      {/* TABLE */}
      <div className="call-table-card">
        <table>
          <thead>
            <tr>
              <th>Caller</th>
              <th>Number</th>
              <th>Type</th>
              <th>Date & Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredCalls.map((c) => (
              <tr key={c.id}>
                <td>{c.caller}</td>
                <td>{c.number}</td>
                <td>{c.type}</td>
                <td>{c.datetime}</td>

                {/* BEAUTIFUL STATUS BADGE */}
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(c.status)}`}>
                    <span className="status-dot"></span>
                    {c.status}
                  </span>
                </td>

                <td>
                  <button className="call-view-btn" onClick={() => openPanel(c)}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RIGHT-SIDE DETAILS PANEL */}
      <IncidentDetailsPanel
        open={panelOpen}
        onClose={closePanel}
        incident={selected}
        onUpdateStatus={handleStatusChange}
      />
    </div>
  );
}
