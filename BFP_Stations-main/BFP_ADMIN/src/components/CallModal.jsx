import React from "react";
import "../style/CallModal.css";

const CallModal = ({ callData, onClose, topMode }) => {
  return (
    <div className={topMode ? "top-card-horizontal" : "modal-overlay"}>
      <div className="modal-card-horizontal">
        <div className="card-info">
          <p><strong>Contact:</strong> {callData.number}</p>
          <p><strong>Date:</strong> {callData.date}</p>
          <p><strong>Time:</strong> {callData.time}</p>
          <p><strong>Status:</strong> <span className={`status ${callData.status.toLowerCase()}`}>{callData.status}</span></p>
        </div>
        <button className="end-btn" onClick={onClose}>End</button>
      </div>
    </div>
  );
};

export default CallModal;
