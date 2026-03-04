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
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

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

  // Search and Filter
  const filteredCalls = calls.filter((c) => {
    // Search filter
    const matchesSearch = 
      c.caller.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    
    // Type filter
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

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

      {/* SEARCH AND FILTER BAR */}
      <div className="call-search-row">
        <div className="call-search-wrapper">
          <span className="call-search-icon">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            className="call-search-input"
            placeholder="Search Caller, Number, Location, or Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* FILTER DROPDOWNS */}
        <div className="filter-dropdowns">
          <select 
            className="filter-select"
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Dispatch On the Way">Dispatch On the Way</option>
            <option value="Resolved">Resolved</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          
          <select 
            className="filter-select"
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Electrical Fire">Electrical Fire</option>
            <option value="Medical Emergency">Medical Emergency</option>
            <option value="Structural Fire">Structural Fire</option>
            <option value="Vehicle Accident">Vehicle Accident</option>
            <option value="Other">Other</option>
          </select>
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
