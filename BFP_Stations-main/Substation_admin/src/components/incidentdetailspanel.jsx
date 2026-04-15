import { useEffect, useState } from 'react';
import '../style/incidentdetailspanel.css';
import ConfirmModal from './ConfirmModal';

/**
 * Props:
 * - open: boolean
 * - onClose: fn()
 * - incident: object (id, caller, number, location, type, alarm, narrative, timeline: [{status, time}])
 * - onUpdateStatus: fn(newStatus) -> optional
 */
export default function IncidentDetailsPanel({ open, onClose, incident, onUpdateStatus }) {
  const [localIncident, setLocalIncident] = useState(null);
  const [statusModal, setStatusModal] = useState({ open: false, newStatus: null });
  const [pickerOpen, setPickerOpen] = useState(false);
  const STATUS_FLOW = [
    'Pending',
    'Dispatch On the Way',
    'Ongoing Response',
    'Fire Under Control',
    'Resolved',
  ];

  useEffect(() => {
    setLocalIncident(incident ? JSON.parse(JSON.stringify(incident)) : null);
  }, [incident]);

  if (!open) return null;

  const changeStatus = (newStatus) => {
    if (!localIncident) return;
    setStatusModal({ open: true, newStatus });
  };

  const confirmStatusChange = () => {
    if (!statusModal.newStatus) return;
    const now = new Date().toISOString();
    // push to timeline
    const newTimeline = (localIncident.timeline || []).concat({
      status: statusModal.newStatus,
      time: now,
    });
    const updated = { ...localIncident, status: statusModal.newStatus, timeline: newTimeline };
    setLocalIncident(updated);
    if (onUpdateStatus) onUpdateStatus(statusModal.newStatus, updated);
    setStatusModal({ open: false, newStatus: null });
  };

  const latestStatus = localIncident?.status || 'Pending';

  return (
    <div className="idp-overlay" onClick={onClose}>
      <div className="idp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="idp-header">
          <button className="idp-close" onClick={onClose}>
            ×
          </button>
          <h2>Incident Report Details</h2>
          <div className="idp-status-wrap">
            <span className={`idp-badge idp-${latestStatus.replace(/\s/g, '-').toLowerCase()}`}>
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
                <div className="muted">{localIncident?.caller || '—'}</div>
              </div>
              <div>
                <label>Phone</label>
                <div className="muted">{localIncident?.number || '—'}</div>
              </div>
            </div>

            <div className="idp-row">
              <div style={{ flex: 1 }}>
                <label>Location</label>
                <div className="muted">{localIncident?.location || '—'}</div>
              </div>
              <div style={{ width: 220 }}>
                <label>Alarm Level</label>
                <div className="muted">{localIncident?.alarm || '—'}</div>
              </div>
            </div>

            <div className="idp-row">
              <div style={{ flex: 1 }}>
                <label>Type</label>
                <div className="muted">{localIncident?.type || '—'}</div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label>Narrative</label>
              <div className="idp-narrative">{localIncident?.narrative || '—'}</div>
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
                      className={`timeline-item ${t.status.replace(/\s/g, '-').toLowerCase()}`}
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

          <section className="idp-section">
            <h3>Caller Photo Evidence</h3>
            {(localIncident?.evidenceItems || []).length === 0 ? (
              <div className="timeline-empty">No caller photo evidence yet.</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                {localIncident.evidenceItems.map((evidence, idx) => (
                  <div
                    key={evidence.evidenceId || `${evidence.previewUrl}-${idx}`}
                    style={{
                      border: '1px solid #eee',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#fff',
                    }}
                  >
                    <a href={evidence.previewUrl} target="_blank" rel="noreferrer">
                      <img
                        src={evidence.previewUrl}
                        alt="Caller evidence"
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 140,
                          objectFit: 'cover',
                          background: '#f3f3f3',
                        }}
                      />
                    </a>
                    <div style={{ padding: 10, fontSize: 12, color: '#666' }}>
                      <div style={{ fontWeight: 700, color: '#333' }}>
                        {evidence.capturePhase === 'post_call' ? 'Post-call upload' : 'In-call upload'}
                      </div>
                      <div>{evidence.callerName || localIncident?.caller || 'Caller'}</div>
                      <div>
                        {evidence.uploadedAt
                          ? new Date(evidence.uploadedAt).toLocaleString()
                          : 'Unknown upload time'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="idp-footer">
          <div className="idp-actions-left">
            <button className="idp-btn idp-btn-apply" onClick={() => setPickerOpen(true)}>
              Update Status
            </button>
          </div>
        </div>
      </div>

      {/* Status Picker Modal */}
      {pickerOpen && (
        <div className="idp-overlay" style={{ zIndex: 1100 }} onClick={() => setPickerOpen(false)}>
          <div className="idp-status-picker" onClick={(e) => e.stopPropagation()}>
            <h3>Select New Status</h3>
            <div className="idp-status-choices">
              {STATUS_FLOW.map((s) => (
                <button
                  key={s}
                  className={`idp-status-choice ${s.replace(/\s/g, '-').toLowerCase()} ${statusModal.newStatus === s ? 'selected' : ''}`}
                  onClick={() => setStatusModal({ open: false, newStatus: s })}
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
                  setStatusModal({ open: false, newStatus: null });
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

      {/* Status Update Confirmation Modal */}
      {statusModal.open && (
        <ConfirmModal
          title="Update Status"
          message={`Are you sure you want to update the incident status to "${statusModal.newStatus}"?`}
          onConfirm={confirmStatusChange}
          onCancel={() => setStatusModal({ open: false, newStatus: null })}
        />
      )}
    </div>
  );
}
