export default function ConfirmModal({ title, message, onConfirm, onCancel, type = 'danger' }) {
  const getIcon = () => {
    switch(type) {
      case 'danger':
        return 'fa-trash';
      case 'warning':
        return 'fa-exclamation-triangle';
      case 'archive':
        return 'fa-archive';
      default:
        return 'fa-question-circle';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-icon">
          <i className={`fa-solid ${getIcon()}`}></i>
        </div>

        <h2 className="modal-title">{title}</h2>
        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onCancel}>
            <i className="fa-solid fa-xmark"></i>
            <span>Cancel</span>
          </button>

          <button className="modal-btn confirm" onClick={onConfirm}>
            <i className="fa-solid fa-check"></i>
            <span>Confirm</span>
          </button>
        </div>

      </div>
    </div>
  );
}
