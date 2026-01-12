export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">

        <h2 className="modal-title">{title}</h2>
        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onCancel}>
            Cancel
          </button>

          <button className="modal-btn confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>

      </div>
    </div>
  );
}
