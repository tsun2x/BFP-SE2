import { useEffect, useState } from "react";
import "../style/incidentdetailspanel.css";
import ConfirmModal from "./ConfirmModal";

/**
 * Props:
 * - open: boolean
 * - onClose: fn()
 * - incident: object (id, caller, number, location, type, alarm, narrative, timeline: [{status, time}])
 * - onUpdateStatus: fn(newStatus) -> optional
 */
export default function IncidentDetailsPanel({
  open,
  onClose,
  incident,
  onUpdateStatus,
}) {
  const [localIncident, setLocalIncident] = useState(null);
  const [statusModal, setStatusModal] = useState({
    open: false,
    newStatus: "",
  });
  const [pickerOpen, setPickerOpen] = useState(false);
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

    // Show confirmation modal instead of directly changing
    setStatusModal({
      open: true,
      newStatus: newStatus,
      currentStatus: localIncident.status || "Pending",
    });
  };

  const confirmStatusChange = () => {
    if (!localIncident || !statusModal.newStatus) return;

    const now = new Date().toISOString();
    // push to timeline
    const newTimeline = (localIncident.timeline || []).concat({
      status: statusModal.newStatus,
      time: now,
    });
    const updated = {
      ...localIncident,
      status: statusModal.newStatus,
      timeline: newTimeline,
    };
    setLocalIncident(updated);
    if (onUpdateStatus) onUpdateStatus(statusModal.newStatus, updated);

    // Close modal
    setStatusModal({ open: false, newStatus: "" });
  };

  const cancelStatusChange = () => {
    setStatusModal({ open: false, newStatus: "" });
  };

  const latestStatus = localIncident?.status || "Pending";

  return (
    <>
      <div className="idp-overlay" onClick={onClose}>
        <div className="idp-panel" onClick={(e) => e.stopPropagation()}>
          <div className="idp-header">
            <button className="idp-close" onClick={onClose}>
              ×
            </button>
            <h2>Incident Report Details</h2>
            <div className="idp-status-wrap">
              <span
                className={`idp-badge idp-${latestStatus.replace(/\s/g, "-").toLowerCase()}`}
              >
                {latestStatus}
              </span>
            </div>
          </div>

          <div className="idp-body">
            <section className="idp-section info">
              <h3>Caller Information</h3>
              <div className="idp-row">
                <div>
                  <label>Caller</label>
                  <div className="muted">{localIncident?.caller || "—"}</div>
                </div>
                <div>
                  <label>Phone</label>
                  <div className="muted">{localIncident?.number || "—"}</div>
                </div>
              </div>

              <div className="idp-row">
                <div style={{ flex: 1 }}>
                  <label>Location</label>
                  <div className="muted">{localIncident?.location || "—"}</div>
                </div>
                <div style={{ width: 220 }}>
                  <label>Alarm Level</label>
                  <div className="muted">{localIncident?.alarm || "—"}</div>
                </div>
              </div>

              <div className="idp-row">
                <div style={{ flex: 1 }}>
                  <label>Type</label>
                  <div className="muted">{localIncident?.type || "—"}</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label>Narrative</label>
                <div className="idp-narrative">
                  {localIncident?.narrative || "—"}
                </div>
              </div>
            </section>

            <section className="idp-section timeline">
              <h3>Incident Timeline</h3>
              <div className="timeline-wrap">
                {/* left vertical line + entries */}
                {(localIncident?.timeline || []).length === 0 ? (
                  <div className="timeline-empty">No timeline events yet.</div>
                ) : (
                  <ul className="timeline-list">
                    {localIncident.timeline.map((t, i) => (
                      <li
                        key={i}
                        className={`timeline-item ${t.status.replace(/\s/g, "-").toLowerCase()}`}
                      >
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <div className="timeline-status">{t.status}</div>
                          <div className="timeline-time muted">
                            {new Date(t.time).toLocaleString()}
                          </div>
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
              <button
                className="idp-btn idp-btn-apply"
                onClick={() => setPickerOpen(true)}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Picker Modal */}
      {pickerOpen && (
        <div
          className="idp-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="idp-status-picker"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Select New Status</h3>
            <div className="idp-status-choices">
              {STATUS_FLOW.map((s) => (
                <button
                  key={s}
                  className={`idp-status-choice ${s.replace(/\s/g, "-").toLowerCase()} ${statusModal.newStatus === s ? "selected" : ""}`}
                  onClick={() =>
                    setStatusModal({
                      open: false,
                      newStatus: s,
                      currentStatus: localIncident?.status || "Pending",
                    })
                  }
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="idp-picker-actions">
              <button
                className="idp-btn idp-btn-cancel"
                onClick={() => {
                  setPickerOpen(false);
                  setStatusModal({ open: false, newStatus: "" });
                }}
              >
                Cancel
              </button>
              <button
                className="idp-btn idp-btn-apply"
                disabled={!statusModal.newStatus}
                onClick={() => {
                  if (!statusModal.newStatus) return;
                  setPickerOpen(false);
                  setStatusModal((prev) => ({ ...prev, open: true }));
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusModal.open && (
        <ConfirmModal
          title="Update Incident Status"
          message={`Are you sure you want to change the incident status from "${statusModal.currentStatus}" to "${statusModal.newStatus}"? This will be recorded in the incident timeline.`}
          type="warning"
          onConfirm={confirmStatusChange}
          onCancel={cancelStatusChange}
        />
      )}
    </>
  );
}
