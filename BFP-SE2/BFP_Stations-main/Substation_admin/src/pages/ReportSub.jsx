// File: ReportSub.jsx
import React, { useState, useEffect } from "react";
import "../style/ReportSub.css";
import ConfirmModal from "../components/ConfirmModal";
import ReplyModal from "../components/ReplyModal"; // Import the separated modal
import apiClient from "../utils/apiClient";

// Sample Reports Data
const sampleReports = [
  {
    id: 1,
    name: "Main Station",
    subject: "Structure Fire - Commercial Building",
    preview: "123 Main Street, 2-story commercial building fire...",
    date: "Jan 15, 2025",
    full: `Full report content from Main Station...

Incident Details:
- Location: 123 Main Street
- Building Type: Commercial
- Fire Severity: High
- Response Time: 6 minutes
- Units Dispatched: 3 fire trucks, 1 ambulance

Status: Under Investigation
Next Steps: Awaiting damage assessment report.`,
    email: "mainstation@bfp.local",
    read: false,
  },
  {
    id: 2,
    name: "North Substation",
    subject: "Medical Emergency - Cardiac Arrest",
    preview: "45 Oak Avenue, patient experiencing cardiac arrest...",
    date: "Jan 14, 2025",
    full: `Full report content from North Substation...

Incident Details:
- Location: 45 Oak Avenue
- Patient Condition: Cardiac Arrest
- Response Time: 4 minutes
- Units Dispatched: 1 ambulance

Patient Status: Stabilized and transported to hospital
Follow-up: Hospital report pending.`,
    email: "north.substation@bfp.local",
    read: true,
  },
  // ... Other reports
];

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function ComposeForm({ stations, onSend, onClose }) {
  const [recipientStationId, setRecipientStationId] = useState("");
  const [officers, setOfficers] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [officersError, setOfficersError] = useState('');
  const [recipientOfficerId, setRecipientOfficerId] = useState("");
  const [sendToAll, setSendToAll] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    async function loadOfficers() {
      setOfficers([]);
      setRecipientOfficerId("");
      setSendToAll(false);
      setOfficersError('');
      if (!recipientStationId) return;
      setOfficersLoading(true);
      try {
        // Call the single backend endpoint supported: /api/officers?station_id=ID
        const res = await apiClient.get(`/officers?station_id=${recipientStationId}`);
        const potential = res?.officers || res?.users || res?.data || res?.rows || res || [];
        const list = Array.isArray(potential) ? potential : [];
        setOfficers(list);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('failed to load officers', e && e.message);
        setOfficers([]);
        setOfficersError(e && e.message ? String(e.message) : 'Failed to load officers');
      } finally {
        setOfficersLoading(false);
      }
    }
    loadOfficers();
  }, [recipientStationId]);

  return (
    <div className="composer-form">
      <div className="composer-fields">
        <select
          className="filter-dropdown composer-to"
          value={recipientStationId}
          onChange={(e) => setRecipientStationId(e.target.value)}
        >
          <option value="">To (Select station)</option>
          {(stations || []).map((s) => (
            <option key={s.station_id} value={String(s.station_id)}>
              {s.station_name}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="search-input composer-subject"
          placeholder="Subject (optional)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {officersLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading officers...</div>
        ) : (
          <>
            <select
              className="filter-dropdown"
              value={recipientOfficerId}
              onChange={(e) => setRecipientOfficerId(e.target.value)}
              disabled={sendToAll || (Array.isArray(officers) && officers.length === 0)}
            >
              <option value="">{Array.isArray(officers) && officers.length > 0 ? 'Select officer (optional)' : 'No officers found'}</option>
              {Array.isArray(officers) && officers.map((o) => (
                <option key={o.user_id || o.id} value={String(o.user_id || o.id)}>{o.full_name || o.name || o.email}</option>
              ))}
            </select>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={sendToAll} onChange={(e) => setSendToAll(e.target.checked)} />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Send to all officers</span>
            </label>
          </>
        )}
      {officersError && <div style={{ color: '#c33', fontSize: 13, marginTop: 8 }}>{officersError}</div>}
      </div>

      <textarea
        className="composer-textarea"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message..."
      />

      <div className="composer-toolbar">
        <div className="composer-left">
          <button type="button" className="btn btn-secondary" title="Attach">📎</button>
          <button type="button" className="btn btn-secondary" title="Emoji">😊</button>
          <button type="button" className="btn btn-secondary" title="Formatting">A</button>
        </div>
        <div className="composer-right">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary composer-send"
            onClick={() => onSend({ recipientStationId, recipientOfficerId, sendToAll, subject, body })}
            disabled={!recipientStationId || (!sendToAll && !recipientOfficerId) || !body.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function ReportSub() {
  // State
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("recent");
  const [selectedId, setSelectedId] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, id: null, type: null });
  const [replyModal, setReplyModal] = useState({ open: false, to: null });
  const [composeModal, setComposeModal] = useState({ open: false });
  const [stations, setStations] = useState([]);
  const [threadMessages, setThreadMessages] = useState([]);

  const selected = reports.find((r) => r.id === selectedId) || null;

  const formatDate = (isoOrDateString) => {
    if (!isoOrDateString) return "";
    const d = new Date(isoOrDateString);
    if (Number.isNaN(d.getTime())) return String(isoOrDateString);
    return d.toLocaleString();
  };

  const loadConversations = async () => {
    try {
      const data = await apiClient.get("/conversations");
      const conversations = data?.conversations || [];
      const mapped = conversations.map((c) => {
        const last = c.lastMessage || null;
        const preview = last?.body ? String(last.body).slice(0, 80) : "";
        return {
          id: c.conversationId,
          conversationId: c.conversationId,
          name: c.otherStationName || c.stationBName || c.stationAName || "Station",
          subject: last?.subject || "(No subject)",
          preview,
          date: last?.sent_at || c.updatedAt || null,
          full: last?.body || "",
          email: "",
          read: last ? Boolean(last.is_read) : true,
        };
      });
      setReports(mapped);
      setFilteredReports(mapped);
      // Do not auto-select a message on initial load — keep list-only view
      if (!mapped.find((r) => r.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (e) {
      setReports([]);
      setFilteredReports([]);
      setSelectedId(null);
    }
  };

  const loadThread = async (conversationId) => {
    if (!conversationId) {
      setThreadMessages([]);
      return;
    }
    try {
      const data = await apiClient.get(`/conversations/${conversationId}/messages`);
      setThreadMessages(data?.messages || []);
    } catch (e) {
      setThreadMessages([]);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadThread(selectedId);
    } else {
      setThreadMessages([]);
    }
  }, [selectedId]);

  // --- Filtering & Searching Reports ---
  useEffect(() => {
    let filtered = [...reports];

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.date.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType === "unread") filtered = filtered.filter((r) => !r.read);
    else if (filterType === "read") filtered = filtered.filter((r) => r.read);
    else if (filterType === "recent")
      filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    setFilteredReports(filtered);
    // If the currently selected item is no longer in the filtered list,
    // clear selection instead of auto-selecting the first item.
    if (!filtered.find((r) => r.id === selectedId)) setSelectedId(null);
  }, [searchTerm, filterType, reports]);

  // --- Handlers ---
  const openConfirm = (id, type) => setConfirmState({ open: true, id, type });

  const performConfirm = () => {
    const { id } = confirmState;
    if (!id) return;
    if (confirmState.type === "delete") {
      apiClient
        .delete(`/conversations/${id}`)
        .then(() => loadConversations())
        .catch(() => loadConversations());
    }
    if (selectedId === id) setSelectedId(null);
    setConfirmState({ open: false, id: null, type: null });
  };

  const openReply = (report) => setReplyModal({ open: true, to: report });

  const sendReply = (text) => {
    const conversationId = replyModal?.to?.conversationId || replyModal?.to?.id || null;
    if (!conversationId) {
      setReplyModal({ open: false, to: null });
      return;
    }
    apiClient
      .post(`/conversations/${conversationId}/messages`, { body: text, subject: null })
      .then(() => {
        setReplyModal({ open: false, to: null });
        loadThread(conversationId);
        loadConversations();
      })
      .catch(() => setReplyModal({ open: false, to: null }));
  };

  useEffect(() => {
    async function loadStations() {
      try {
        const data = await apiClient.get("/firestations");
        const all = data?.stations || [];
        const me = (() => {
          try {
            return JSON.parse(localStorage.getItem("user") || "null");
          } catch (e) {
            return null;
          }
        })();
        const myStationId =
          me?.assignedStationId || me?.assigned_station_id || me?.stationInfo?.station_id || null;

        const filtered = myStationId
          ? all.filter((s) => String(s.station_id) !== String(myStationId))
          : all;
        setStations(filtered);
      } catch (e) {
        setStations([]);
      }
    }

    if (composeModal.open) {
      loadStations();
    }
  }, [composeModal.open]);

  const sendNewMessage = async ({ recipientStationId, recipientOfficerId, sendToAll, subject, body }) => {
    const payload = {
      recipientStationId: Number(recipientStationId),
      recipientOfficerId: recipientOfficerId ? Number(recipientOfficerId) : null,
      sendToAll: Boolean(sendToAll),
      subject: subject?.trim() ? subject.trim() : null,
      body: body,
    };
    const res = await apiClient.post("/conversations", payload);
    setComposeModal({ open: false });
    console.log("Message sent:", res);
    await loadConversations();
  };

  return (
    <div className="reports-page">
      <div className="inbox-wrapper">
        {/* LEFT PANEL */}
        <aside className={`inbox-left ${selectedId ? "has-selected" : ""}`}>
          <div className="inbox-left-header">
            <h2>
              <i className="fa-solid fa-inbox"></i> Inbox
            </h2>
            <div className="search-and-filter">
              <button className="btn btn-primary" onClick={() => setComposeModal({ open: true })}>
                <i className="fa-solid fa-pen"></i> New Message
              </button>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  className="search-input"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
              </div>
              <select
                className="filter-dropdown"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="recent">Recent</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          <div className="inbox-list">
            {filteredReports.length === 0 ? (
              <div className="empty-state">No reports found</div>
            ) : (
              filteredReports.map((r) => (
                <div
                  key={r.id}
                  className={`inbox-item ${selectedId === r.id ? "active" : ""}`}
                  onClick={() => setSelectedId(r.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedId(r.id)}
                >
                  <div className="item-left">
                    <div className="avatar">
                      <i className="fa-solid fa-file-lines"></i>
                    </div>
                    {!r.read && (
                      <div className="unread-indicator">
                        <i className="fa-solid fa-circle"></i>
                      </div>
                    )}
                  </div>
                  <div className="item-body">
                    <div className="item-top">
                      <div className="item-name">{r.name}</div>
                      <div className="item-date">{formatDate(r.date)}</div>
                    </div>
                    <div className="item-subject">{r.subject}</div>
                    <div className="item-preview">{r.preview}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT PANEL */}
        <section className="inbox-right">
          {selected && (
            <div className="message-card">
              <div className="message-card-header">
                <h2 className="subject">{selected.subject}</h2>
                <div className="message-controls">
                  <button
                    className="small-link"
                    onClick={() => openConfirm(selected.id, "archive")}
                  >
                    <i className="fa-solid fa-archive"></i> Archive
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => openConfirm(selected.id, "delete")}
                  >
                    <i className="fa-solid fa-trash"></i> Delete
                  </button>
                  <button className="btn btn-primary" onClick={() => openReply(selected)}>
                    <i className="fa-solid fa-reply"></i> Reply
                  </button>
                  <button className="back-button-content" onClick={() => setSelectedId(null)}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                  </button>
                </div>
              </div>

              <div className="message-sender">
                <div className="sender-avatar">
                  <i className="fa-solid fa-building"></i>
                </div>
                <div className="sender-meta">
                  <div className="sender-name">{selected.name}</div>
                  <div className="sender-email">
                    {formatDate(selected.date)}
                  </div>
                </div>
              </div>

              <div className="message-content">
                {(threadMessages && threadMessages.length > 0
                  ? threadMessages
                  : [{ message_id: "fallback", body: selected.full, sent_at: selected.date }]
                ).map((m) => (
                  <p key={m.message_id}>
                    {String(m.body || "").split("\n").map((para, idx) => (
                      <span key={idx}>
                        {para}
                        <br />
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* CONFIRM MODAL */}
      {confirmState.open && (
        <ConfirmModal
          title={confirmState.type === "delete" ? "Delete Report" : "Archive Report"}
          message={
            confirmState.type === "delete"
              ? "Are you sure you want to permanently delete this report?"
              : "Archive this report? It will be removed from the inbox list."
          }
          type={confirmState.type}
          onConfirm={performConfirm}
          onCancel={() => setConfirmState({ open: false, id: null, type: null })}
        />
      )}

      {/* REPLY MODAL */}
      <ReplyModal
        open={replyModal.open}
        to={replyModal.to}
        onSend={sendReply}
        onClose={() => setReplyModal({ open: false, to: null })}
      />

      <Modal
        open={composeModal.open}
        title="New Message"
        onClose={() => setComposeModal({ open: false })}
      >
        <ComposeForm
          stations={stations}
          onSend={sendNewMessage}
          onClose={() => setComposeModal({ open: false })}
        />
      </Modal>

      {/* EMPTY STATE ICON */}
      {filteredReports.length === 0 && (
        <div className="empty-state-icon">
          <i className="fa-solid fa-inbox"></i>
        </div>
      )}
    </div>
  );
}