// File: ReportSub.jsx
import React, { useState, useEffect } from "react";
import "../style/ReportSub.css";
import ConfirmModal from "../components/ConfirmModal";
import ReplyModal from "../components/ReplyModal"; // Import the separated modal

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

// Main Component
export default function ReportSub() {
  // State
  const [reports, setReports] = useState(sampleReports);
  const [filteredReports, setFilteredReports] = useState(sampleReports);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("recent");
  const [selectedId, setSelectedId] = useState(sampleReports[0]?.id || null);
  const [confirmState, setConfirmState] = useState({ open: false, id: null, type: null });
  const [replyModal, setReplyModal] = useState({ open: false, to: null });

  const selected = reports.find((r) => r.id === selectedId) || null;

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
    if (!filtered.find((r) => r.id === selectedId)) setSelectedId(filtered[0]?.id || null);
  }, [searchTerm, filterType, reports]);

  // --- Handlers ---
  const openConfirm = (id, type) => setConfirmState({ open: true, id, type });

  const performConfirm = () => {
    const { id } = confirmState;
    if (!id) return;
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
    setConfirmState({ open: false, id: null, type: null });
  };

  const openReply = (report) => setReplyModal({ open: true, to: report });

  const sendReply = (text) => {
    console.log("Reply to", replyModal.to.email, text);
    setReplyModal({ open: false, to: null });
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
                      <div className="item-date">{r.date}</div>
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
                    {selected.email} • {selected.date}
                  </div>
                </div>
              </div>

              <div className="message-content">
                {selected.full.split("\n").map((para, i) => (
                  <p key={i}>{para}</p>
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

      {/* EMPTY STATE ICON */}
      {filteredReports.length === 0 && (
        <div className="empty-state-icon">
          <i className="fa-solid fa-inbox"></i>
        </div>
      )}
    </div>
  );
}