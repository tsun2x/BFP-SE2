import React from "react";
import "../style/CallModal.css";

const IncomingCallModal = ({ callNumber, onAccept }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Incoming Call</h2>
        <p><strong>Contact No:</strong> {callNumber}</p>

        <div className="modal-buttons">
          <button className="accept-btn" onClick={onAccept}>Accept</button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
