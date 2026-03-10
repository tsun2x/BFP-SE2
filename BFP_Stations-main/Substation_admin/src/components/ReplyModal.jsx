// File: ReplyModal.jsx
import React, { useState } from "react";
import "../style/ReplyModal.css";

export default function ReplyModal({ open, to, onSend, onClose }) {
  const [text, setText] = useState("");

  if (!open) return null;

  const handleSend = () => {
    if (!text.trim()) return; // optional: prevent empty send
    onSend(text);
    setText("");
  };

  return (
    <div className="reply-modal-backdrop" onClick={onClose}>
      <div className="reply-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="reply-modal-header">
          <h2>Reply to {to?.name}</h2>
          <button className="reply-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="reply-modal-info">
          <strong>To:</strong> {to?.email}
        </div>

        <textarea
          className="reply-modal-textarea"
          placeholder="Write your reply here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="reply-modal-actions">
          <button className="reply-modal-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="reply-modal-btn send" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}