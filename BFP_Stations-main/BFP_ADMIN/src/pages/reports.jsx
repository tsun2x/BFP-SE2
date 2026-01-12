// File: Reports.jsx
import React, { useState, useEffect } from 'react';
import '../style/reports.css';
import apiClient from "../utils/apiClient";

/*
  Usage:
  - Place this component inside your app's main content area.
  - Make sure your global layout keeps the original sidebar (width: 240px) at the left.
  - This component offsets itself with `margin-left: 240px` so it will sit *beside* your sidebar
    instead of overlapping it.

  Example:
    <Route path="/reports" element={<Reports />} />

*/

const sampleReports = [];

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [reports, setReports] = useState(sampleReports);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, id: null, type: null });
  const [replyModal, setReplyModal] = useState({ open: false, to: null });

  const selected = reports.find((r) => r.id === selectedId) || null;

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      try {
        const data = await apiClient.get('/incidents');
        const incidents = data.incidents || [];

        const mapped = incidents.map((inc) => {
          // Parse details string: "Incident: X | Location: Y | Narrative: Z"
          let incidentType = '';
          let location = '';
          let narrative = '';
          const details = inc.details || '';
          const match = details.match(/Incident:\s*(.*?)\s*\|\s*Location:\s*(.*?)\s*\|\s*Narrative:\s*(.*)$/);
          if (match) {
            incidentType = match[1] || '';
            location = match[2] || '';
            narrative = match[3] || '';
          }

          const date = inc.call_time ? new Date(inc.call_time) : null;
          const formattedDate = date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

          const callerName = inc.full_name || 'Unknown Caller';
          const phone = inc.phone_number || 'N/A';
          const stationName = inc.station_name || 'Unassigned Station';

          const fullText = `Caller Information\n\n` +
            `Name: ${callerName}\n` +
            `Phone: ${phone}\n` +
            `Station: ${stationName}\n\n` +
            `Location\n\n` +
            `Exact Location: ${location || `(lat: ${inc.user_latitude}, lng: ${inc.user_longitude})`}\n\n` +
            `Incident Details\n\n` +
            `Type of Incident: ${incidentType || 'Not specified'}\n` +
            `Initial Alarm Level: ${inc.initial_alarm_level || 'N/A'}\n` +
            `Current Alarm Level: ${inc.current_alarm_level || 'N/A'}\n` +
            `Narrative Report: ${narrative || 'No details'}`;

          return {
            id: inc.alarm_id,
            name: stationName,
            subject: incidentType || 'Incident Report',
            preview: location || `${callerName} (${phone})`,
            date: formattedDate,
            full: fullText,
            email: `${callerName} • ${phone}`,
          };
        });

        if (isMounted) {
          setReports(mapped);
          if (mapped.length > 0) {
            setSelectedId(mapped[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load incidents for reports:', err);
      }
    }

    loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  function openConfirm(id, type) {
    setConfirmState({ open: true, id, type });
  }

  function performConfirm() {
    const { id, type } = confirmState;
    if (!id) return;
    if (type === 'delete' || type === 'archive') {
      setReports((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
    setConfirmState({ open: false, id: null, type: null });
  }

  function openReply(report) {
    setReplyModal({ open: true, to: report });
  }

  function sendReply(text) {
    // Hook your API here. For demo, we show console log.
    console.log('Send reply to', replyModal.to.email, text);
    setReplyModal({ open: false, to: null });
  }

  return (
    <div className="reports-page">
      <div className="inbox-wrapper">
        <aside className="inbox-left">
          <div className="inbox-left-header">Inbox</div>
          <div className="inbox-list">
            {reports.map((r) => (
              <div
                key={r.id}
                className={`inbox-item ${selectedId === r.id ? 'active' : ''}`}
                onClick={() => setSelectedId(r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedId(r.id)}
              >
                <div className="item-left">
                  <div className="avatar">{r.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                </div>
                <div className="item-body">
                  <div className="item-top">
                    <div className="item-name">{r.name}</div>
                    <div className="item-date">{r.date}</div>
                  </div>
                  <div className="item-subject">{r.subject}</div>
                  <div className="item-preview">{r.preview}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="inbox-right">
          {!selected ? (
            <div className="empty-state">Select a report to read it.</div>
          ) : (
            <div className="message-card">
              <div className="message-card-header">
                <h2 className="subject">{selected.subject}</h2>
                <div className="message-controls">
                  <button className="small-link" onClick={() => openConfirm(selected.id, 'archive')}>Archive</button>
                  <button className="btn btn-danger" onClick={() => openConfirm(selected.id, 'delete')}>Delete</button>
                  <button className="btn btn-primary" onClick={() => openReply(selected)}>Reply</button>
                </div>
              </div>

              <div className="message-sender">
                <div className="sender-avatar">{selected.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                <div className="sender-meta">
                  <div className="sender-name">{selected.name}</div>
                  <div className="sender-email">{selected.email} • {selected.date}</div>
                </div>
              </div>

              <div className="message-content">
                {selected.full.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>


              <div className="composer">
                <textarea className="composer-textarea" placeholder={`Reply to ${selected.name}...`} />
                <div className="composer-actions">
                  <button className="btn btn-secondary">Cancel</button>
                  <button className="btn btn-primary">Send</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Confirm Modal */}
      <Modal open={confirmState.open} title={confirmState.type === 'delete' ? 'Delete Report' : 'Archive Report'} onClose={() => setConfirmState({ open:false, id:null, type:null })}>
        <p>{confirmState.type === 'delete' ? 'Are you sure you want to permanently delete this report?' : 'Archive this report? It will be removed from the inbox list.'}</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setConfirmState({ open:false, id:null, type:null })}>Cancel</button>
          <button className="btn btn-danger" onClick={performConfirm}>Confirm</button>
        </div>
      </Modal>

      {/* Reply Modal */}
      <Modal open={replyModal.open} title={replyModal.to ? `Reply to ${replyModal.to.name}` : 'Reply'} onClose={() => setReplyModal({ open:false, to:null })}>
        <ReplyForm to={replyModal.to} onSend={sendReply} onClose={() => setReplyModal({ open:false, to:null })} />
      </Modal>

    </div>
  );
}

function ReplyForm({ to, onSend, onClose }) {
  const [text, setText] = useState('');
  return (
    <div>
      <div style={{ marginBottom: 10 }}><strong>To:</strong> {to?.email}</div>
      <textarea className="reply-textarea" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write your reply..." />
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={() => { onSend(text); setText(''); }}>Send</button>
      </div>
    </div>
  );
}