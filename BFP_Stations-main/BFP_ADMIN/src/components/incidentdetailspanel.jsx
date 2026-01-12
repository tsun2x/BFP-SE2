import { useEffect, useState } from "react";
import "../style/incidentdetailspanel.css";

/**
 * Props:
 * - open: boolean
 * - onClose: fn()
 * - incident: object (id, caller, number, location, type, alarm, narrative, timeline: [{status, time}])
 * - onUpdateStatus: fn(newStatus) -> optional
 */
export default function IncidentDetailsPanel({ open, onClose, incident, onUpdateStatus }) {
  const [localIncident, setLocalIncident] = useState(null);
  const STATUS_FLOW = [
    "Pending",
    "Dispatch On the Way",
    "Ongoing Response",
    "Fire Under Control",
    "Resolved",
  ];

  useEffect(() => {
    setLocalIncident(incident ? JSON.parse(JSON.stringify(incident)) : null);
  }, [incident]);

  if (!open) return null;

  const changeStatus = (newStatus) => {
    if (!localIncident) return;
    const now = new Date().toISOString();
    // push to timeline
    const newTimeline = (localIncident.timeline || []).concat({
      status: newStatus,
      time: now,
    });
    const updated = { ...localIncident, status: newStatus, timeline: newTimeline };
    setLocalIncident(updated);
    if (onUpdateStatus) onUpdateStatus(newStatus, updated);
  };

  const latestStatus = localIncident?.status || "Pending";

  return (
    <div className="idp-overlay" onClick={onClose}>
      <div className="idp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="idp-header">
          <button className="idp-close" onClick={onClose}>×</button>
          <h2>Incident Report Details</h2>
          <div className="idp-status-wrap">
            <span className={`idp-badge idp-${latestStatus.replace(/\s/g,'-').toLowerCase()}`}>
              {latestStatus}
            </span>
          </div>
        </div>

        <div className="idp-body">
          <section className="idp-section info">
            <h3>Caller Information</h3>
            <div className="idp-row">
              <div><label>Caller</label><div className="muted">{localIncident?.caller || "—"}</div></div>
              <div><label>Phone</label><div className="muted">{localIncident?.number || "—"}</div></div>
            </div>

            <div className="idp-row">
              <div style={{flex:1}}><label>Location</label><div className="muted">{localIncident?.location || "—"}</div></div>
              <div style={{width:220}}><label>Alarm Level</label><div className="muted">{localIncident?.alarm || "—"}</div></div>
            </div>

            <div className="idp-row">
              <div style={{flex:1}}><label>Type</label><div className="muted">{localIncident?.type || "—"}</div></div>
            </div>

            <div style={{marginTop:12}}>
              <label>Narrative</label>
              <div className="idp-narrative">{localIncident?.narrative || "—"}</div>
            </div>
          </section>

          <section className="idp-section timeline">
            <h3>Incident Timeline</h3>
            <div className="timeline-wrap">
              {/* left vertical line + entries */}
              { (localIncident?.timeline || []).length === 0 ? (
                <div className="timeline-empty">No timeline events yet.</div>
              ) : (
                <ul className="timeline-list">
                  {localIncident.timeline.map((t, i) => (
                    <li key={i} className={`timeline-item ${t.status.replace(/\s/g,'-').toLowerCase()}`}>
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <div className="timeline-status">{t.status}</div>
                        <div className="timeline-time muted">{new Date(t.time).toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="idp-footer">
          <div className="idp-actions-left">
            <select
              className="idp-select"
              value={localIncident?.status || "Pending"}
              onChange={(e) => changeStatus(e.target.value)}
            >
              {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            
            <button
              className="idp-btn idp-btn-apply"
              onClick={() => changeStatus(localIncident?.status || "Pending")}
            >
              Update Status
            </button>
          </div>

      
        </div>
      </div>
    </div>
  );
}

