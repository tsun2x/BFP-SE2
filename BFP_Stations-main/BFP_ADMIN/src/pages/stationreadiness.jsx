import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useStatus } from "../context/StatusContext";
import "../style/stationreadiness.css";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";
import apiClient from "../utils/apiClient";

export default function StationReadiness() {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState({
    firetruck: false,
    scba: false,
    hoses: false,
    radio: false,
    water: false,
    crew: false,
    oic: false,
    driver: false,
    generator: false,
  });

  const [checklistLabels, setChecklistLabels] = useState({
    firetruck: "Firetruck Operational",
    scba: "SCBA Sets Complete",
    hoses: "Hoses Functional",
    radio: "Radio Communication Working",
    water: "Water Supply Adequate",
    crew: "Minimum Crew On Duty",
    oic: "Officer-In-Charge Present",
    driver: "Driver Available",
    generator: "Generator Functional",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [newItemKey, setNewItemKey] = useState("");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("equipment");
  const [editItemLabel, setEditItemLabel] = useState("");

  // Use status context
  const { updateStationStatus } = useStatus();

  const toggleItem = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Checklist management functions
  const addChecklistItem = () => {
    if (newItemLabel.trim()) {
      const key = newItemLabel.toLowerCase().replace(/\s+/g, '_');
      setChecklist(prev => ({ ...prev, [key]: false }));
      setChecklistLabels(prev => ({ ...prev, [key]: newItemLabel }));
      setNewItemLabel("");
      setNewItemCategory("equipment");
      setToastMessage("New checklist item added successfully");
      setToastType("success");
    }
  };

  const updateChecklistItem = () => {
    if (editingItem && editItemLabel.trim()) {
      setChecklistLabels(prev => ({ ...prev, [editingItem]: editItemLabel }));
      setEditingItem(null);
      setEditItemLabel("");
      setToastMessage("Checklist item updated successfully");
      setToastType("success");
    }
  };

  const deleteChecklistItem = (key) => {
    setItemToDelete(key);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setChecklist(prev => {
        const newChecklist = { ...prev };
        delete newChecklist[itemToDelete];
        return newChecklist;
      });
      setChecklistLabels(prev => {
        const newLabels = { ...prev };
        delete newLabels[itemToDelete];
        return newLabels;
      });
      setToastMessage("Checklist item deleted successfully");
      setToastType("success");
      setItemToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  const openEditModal = (key, label) => {
    setEditingItem(key);
    setEditItemLabel(label);
  };

  // COMPUTE STATUS
  const criticalFail =
    !checklist.firetruck ||
    !checklist.radio ||
    !checklist.driver ||
    !checklist.scba;

  const partiallyReady = Object.values(checklist).includes(false);

  let finalStatus = "READY";
  if (criticalFail) finalStatus = "NOT_READY";
  else if (partiallyReady) finalStatus = "PARTIALLY_READY";

  // Calculate readiness percentage
  const checkedItems = Object.values(checklist).filter(item => item).length;
  const readinessPercentage = Math.round((checkedItems / Object.keys(checklist).length) * 100);

  const openConfirm = () => setModalOpen(true);

  const submitReadiness = async () => {
    setModalOpen(false);
    setLoading(true);

    try {
      if (!user?.assignedStationId) {
        throw new Error("Your account is not assigned to a station.");
      }

      const payload = {
        status: finalStatus,
        readinessPercentage,
        equipmentChecklist: checklist
      };

      await apiClient.post('/station-readiness', payload);

      // Update UI status
      updateStationStatus(finalStatus, readinessPercentage);

      setToastMessage(`Station readiness submitted: ${finalStatus.replace(/_/g, " ")} (${readinessPercentage}%)`);
      setToastType("success");

      console.log("Submitted Station Readiness:", {
        stationId: user.assignedStationId,
        checklist,
        finalStatus,
        readinessPercentage,
        time: new Date(),
      });
    } catch (error) {
      console.error("Error submitting readiness:", error);
      setToastMessage(error.message || "Failed to submit readiness");
      setToastType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="readiness-wrapper">
      <h1 className="readiness-title">BFP Station Readiness</h1>

      <div className="readiness-container">
        {/* Header */}
        <div className="readiness-header">
          <h2>Station: {user?.stationInfo?.station_name || 'Not Assigned'}</h2>
          <button className="edit-checklist-btn" onClick={() => setEditModalOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Checklist
          </button>
        </div>

        {/* Content */}
        <div className="readiness-content">

          {/* Equipment Checklist */}
          <div className="checklist-section">
            <h3 className="section-title">Equipment Checklist</h3>
            <div className="checklist-items">
              {Object.entries(checklistLabels)
                .filter(([key]) => ['firetruck', 'scba', 'hoses', 'radio', 'water'].includes(key))
                .map(([key, label]) => (
                <label key={key} className="check-row">
                  <input
                    type="checkbox"
                    checked={checklist[key] || false}
                    onChange={() => toggleItem(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Personnel & Station */}
          <div className="checklist-section">
            <h3 className="section-title">Personnel & Station</h3>
            <div className="checklist-items">
              {Object.entries(checklistLabels)
                .filter(([key]) => ['crew', 'oic', 'driver', 'generator'].includes(key))
                .map(([key, label]) => (
                <label key={key} className="check-row">
                  <input
                    type="checkbox"
                    checked={checklist[key] || false}
                    onChange={() => toggleItem(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Section */}
          <div className="status-section">
            <h3>Station Status</h3>
            <div className={`status-meter ${finalStatus.replace(/_/g, "").toLowerCase()}`}>
              <span>{finalStatus.replace(/_/g, " ")}</span>
              <span className="readiness-percent">{readinessPercentage}%</span>
            </div>
            <p className="status-note">Review your checklist before confirming readiness.</p>
            <button className="confirm-button" onClick={openConfirm} disabled={loading}>
              {loading ? "Submitting..." : "Confirm Readiness"}
            </button>
          </div>

        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Manage Checklist Items</h3>
              <button className="close-modal-btn" onClick={() => {
                setEditModalOpen(false);
                setEditingItem(null);
                setNewItemKey("");
                setNewItemLabel("");
                setEditItemLabel("");
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="edit-modal-content">
              {/* Add New Item */}
              <div className="add-item-section">
                <h4>Add New Item</h4>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="category-select"
                  >
                    <option value="equipment">Equipment Checklist</option>
                    <option value="personnel">Personnel & Station</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Name (e.g., "Firetruck Operational")</label>
                  <input
                    type="text"
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    placeholder="Enter item name"
                  />
                </div>
                <button className="add-item-btn" onClick={addChecklistItem}>
                  Add Item
                </button>
              </div>

              {/* Edit Existing Item */}
              {editingItem && (
                <div className="edit-item-section">
                  <h4>Edit Item</h4>
                  <div className="form-group">
                    <label>Display Text</label>
                    <input
                      type="text"
                      value={editItemLabel}
                      onChange={(e) => setEditItemLabel(e.target.value)}
                      placeholder="Enter display text"
                    />
                  </div>
                  <div className="edit-actions">
                    <button className="save-item-btn" onClick={updateChecklistItem}>
                      Save Changes
                    </button>
                    <button className="cancel-edit-btn" onClick={() => {
                      setEditingItem(null);
                      setEditItemLabel("");
                    }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Current Items */}
              <div className="current-items-section">
                <h4>Equipment Checklist</h4>
                <div className="items-list">
                  {Object.entries(checklistLabels)
                    .filter(([key]) => ['firetruck', 'scba', 'hoses', 'radio', 'water'].includes(key))
                    .map(([key, label]) => (
                    <div key={key} className="item-row">
                      <span className="item-key">{key}</span>
                      <span className="item-label">{label}</span>
                      <div className="item-actions">
                        <button 
                          className="item-edit-btn" 
                          onClick={() => openEditModal(key, label)}
                        >
                          Edit
                        </button>
                        <button 
                          className="item-delete-btn" 
                          onClick={() => deleteChecklistItem(key)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <h4 style={{marginTop: '24px'}}>Personnel & Station</h4>
                <div className="items-list">
                  {Object.entries(checklistLabels)
                    .filter(([key]) => ['crew', 'oic', 'driver', 'generator'].includes(key))
                    .map(([key, label]) => (
                    <div key={key} className="item-row">
                      <span className="item-key">{key}</span>
                      <span className="item-label">{label}</span>
                      <div className="item-actions">
                        <button 
                          className="item-edit-btn" 
                          onClick={() => openEditModal(key, label)}
                        >
                          Edit
                        </button>
                        <button 
                          className="item-delete-btn" 
                          onClick={() => deleteChecklistItem(key)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <ConfirmModal
          title="Delete Checklist Item?"
          message={`Are you sure you want to delete "${checklistLabels[itemToDelete]}". This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteModalOpen(false);
            setItemToDelete(null);
          }}
        />
      )}

      {/* MODAL */}
      {modalOpen && (
        <ConfirmModal
          title="Submit Readiness?"
          message={`Your station status is "${finalStatus.replace(/_/g, " ")}" with ${readinessPercentage}% readiness. Submit to Headquarters?`}
          onConfirm={submitReadiness}
          onCancel={() => setModalOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage("")}
        />
      )}
    </div>
  );
}
