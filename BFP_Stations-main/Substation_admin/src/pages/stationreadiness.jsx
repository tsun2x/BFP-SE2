import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStatus } from '../context/StatusContext';
import '../style/stationreadiness.css';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import apiClient from '../utils/apiClient';

export default function StationReadiness() {
  const { user } = useAuth();

  // Core checklist state
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
    firetruck: 'Firetruck Operational',
    scba: 'SCBA Sets Complete',
    hoses: 'Hoses Functional',
    radio: 'Radio Communication Working',
    water: 'Water Supply Adequate',
    crew: 'Minimum Crew On Duty',
    oic: 'Officer-In-Charge Present',
    driver: 'Driver Available',
    generator: 'Generator Functional',
  });

  const [itemCategories, setItemCategories] = useState({
    firetruck: 'equipment',
    scba: 'equipment',
    hoses: 'equipment',
    radio: 'equipment',
    water: 'equipment',
    crew: 'personnel',
    oic: 'personnel',
    driver: 'personnel',
    generator: 'personnel',
  });

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('equipment');
  const [editItemName, setEditItemName] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);

  // Restrict special characters in checklist item names
  const handleLabelChange = (value, setter) => {
    // Only allow letters, numbers, spaces, hyphens, parentheses, and basic punctuation
    const sanitized = value.replace(/[^a-zA-Z0-9\s\-\(\)\.,]/g, '');
    setter(sanitized);
  };

  // Context
  const { updateStationStatus } = useStatus();

  // Fetch saved custom checklist items on mount
  useEffect(() => {
    const fetchChecklistItems = async () => {
      const stationId =
        user?.assignedStationId || user?.assigned_station_id || user?.stationInfo?.station_id;

      if (!stationId) return;

      try {
        const response = await apiClient.get(`/station-checklist-items/${stationId}`);
        const items = response?.data || [];

        if (items.length > 0) {
          const newChecklist = {};
          const newLabels = {};
          const newCategories = {};

          items.forEach((item) => {
            newChecklist[item.item_key] = false;
            newLabels[item.item_key] = item.item_label;
            newCategories[item.item_key] = item.category || 'equipment';
          });

          setChecklist((prev) => ({ ...prev, ...newChecklist }));
          setChecklistLabels((prev) => ({ ...prev, ...newLabels }));
          setItemCategories((prev) => ({ ...prev, ...newCategories }));
        }
      } catch (error) {
        console.error('Error fetching checklist items:', error);
        setToastMessage('Failed to load custom checklist items');
        setToastType('error');
      }
    };

    fetchChecklistItems();
  }, [user]);

  // ===== CORE FUNCTIONS =====

  /**
   * Toggle checklist item completion
   */
  const toggleItem = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Calculate station readiness status
   */
  const calculateReadiness = () => {
    const criticalFail =
      !checklist.firetruck || !checklist.radio || !checklist.driver || !checklist.scba;
    const partiallyReady = Object.values(checklist).includes(false);

    let finalStatus = 'READY';
    if (criticalFail) finalStatus = 'NOT_READY';
    else if (partiallyReady) finalStatus = 'PARTIALLY_READY';

    const checkedItems = Object.values(checklist).filter((item) => item).length;
    const readinessPercentage = Math.round((checkedItems / Object.keys(checklist).length) * 100);

    return { finalStatus, readinessPercentage };
  };

  // ===== CHECKLIST MANAGEMENT FUNCTIONS =====

  /**
   * Add new checklist item
   */
  const addChecklistItem = async () => {
    const trimmed = newItemName.trim();
    if (!trimmed) {
      setToastMessage('Please enter an item name');
      setToastType('error');
      return;
    }

    const key = trimmed.toLowerCase().replace(/\s+/g, '_');

    // Check for duplicate key
    if (checklistLabels[key]) {
      setToastMessage(`An item with the name "${checklistLabels[key]}" already exists`);
      setToastType('error');
      return;
    }

    const stationId =
      user?.assignedStationId || user?.assigned_station_id || user?.stationInfo?.station_id;

    if (!stationId) {
      setToastMessage('Your account is not assigned to a station');
      setToastType('error');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/station-checklist-items', {
        stationId,
        itemKey: key,
        itemLabel: trimmed,
        category: newItemCategory,
      });

      setChecklist((prev) => ({ ...prev, [key]: false }));
      setChecklistLabels((prev) => ({ ...prev, [key]: trimmed }));
      setItemCategories((prev) => ({ ...prev, [key]: newItemCategory }));
      setNewItemName('');
      setNewItemCategory('equipment');
      setToastMessage('New checklist item added successfully');
      setToastType('success');
    } catch (error) {
      console.error('Error adding checklist item:', error);
      setToastMessage(error?.message || 'Failed to add checklist item');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update existing checklist item
   */
  const updateChecklistItem = async () => {
    if (!editingItem) return;
    const trimmed = editItemName.trim();
    if (!trimmed) {
      setToastMessage('Please enter a display name');
      setToastType('error');
      return;
    }

    try {
      setLoading(true);
      await apiClient.put(`/station-checklist-items/${editingItem}`, {
        itemLabel: trimmed,
      });

      setChecklistLabels((prev) => ({ ...prev, [editingItem]: trimmed }));
      setEditingItem(null);
      setEditItemName('');
      setToastMessage('Checklist item updated successfully');
      setToastType('success');
    } catch (error) {
      console.error('Error updating checklist item:', error);
      setToastMessage(error?.message || 'Failed to update checklist item');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete checklist item
   */
  const deleteChecklistItem = (key) => {
    setItemToDelete(key);
    setDeleteModalOpen(true);
  };

  /**
   * Confirm delete operation
   */
  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      setLoading(true);
      await apiClient.delete(`/station-checklist-items/${itemToDelete}`);

      setChecklist((prev) => {
        const newChecklist = { ...prev };
        delete newChecklist[itemToDelete];
        return newChecklist;
      });
      setChecklistLabels((prev) => {
        const newLabels = { ...prev };
        delete newLabels[itemToDelete];
        return newLabels;
      });
      setItemCategories((prev) => {
        const newCategories = { ...prev };
        delete newCategories[itemToDelete];
        return newCategories;
      });
      setToastMessage('Checklist item deleted successfully');
      setToastType('success');
      setItemToDelete(null);
      setDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      setToastMessage(error?.message || 'Failed to delete checklist item');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Open edit modal for specific item
   */
  const openEditModal = (key, label) => {
    setEditingItem(key);
    setEditItemName(label);
  };

  /**
   * Close edit modal and reset state
   */
  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingItem(null);
    setNewItemName('');
    setEditItemName('');
  };

  // ===== SUBMISSION FUNCTION =====

  /**
   * Submit station readiness to server
   */
  const submitReadiness = async () => {
    setModalOpen(false);
    setLoading(true);

    try {
      const { finalStatus, readinessPercentage } = calculateReadiness();

      const payload = {
        status: finalStatus,
        readinessPercentage,
        equipmentChecklist: checklist,
      };

      await apiClient.post('/station-readiness', payload);

      // Update UI status
      updateStationStatus(finalStatus, readinessPercentage);

      setToastMessage(
        `Station readiness submitted: ${finalStatus.replace(/_/g, ' ')} (${readinessPercentage}%)`
      );
      setToastType('success');

      console.log('Submitted Station Readiness:', {
        stationId:
          user?.assignedStationId ||
          user?.assigned_station_id ||
          user?.stationInfo?.station_id ||
          null,
        checklist,
        finalStatus,
        readinessPercentage,
        time: new Date(),
      });
    } catch (error) {
      console.error('Error submitting readiness:', error);
      setToastMessage(error.message || 'Failed to submit readiness');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  // ===== CALCULATIONS =====
  const { finalStatus, readinessPercentage } = calculateReadiness();

  // ===== FILTERED ITEMS =====
  const equipmentItems = Object.entries(checklistLabels).filter(
    ([key]) => itemCategories[key] === 'equipment'
  );

  const personnelItems = Object.entries(checklistLabels).filter(
    ([key]) => itemCategories[key] === 'personnel'
  );

  return (
    <div className="readiness-wrapper">
      <h1 className="readiness-title">BFP Station Readiness</h1>

      <div className="readiness-container">
        {/* Header */}
        <div className="readiness-header">
          <h2>Station: {user?.stationInfo?.station_name || 'Not Assigned'}</h2>
          <button className="edit-checklist-btn" onClick={() => setEditModalOpen(true)}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
              {equipmentItems.map(([key, label]) => (
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
              {personnelItems.map(([key, label]) => (
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
            <div className={`status-meter ${finalStatus.replace(/_/g, '').toLowerCase()}`}>
              <span>{finalStatus.replace(/_/g, ' ')}</span>
              <span className="readiness-percent">{readinessPercentage}%</span>
            </div>
            <p className="status-note">Review your checklist before confirming readiness.</p>
            <button
              className="confirm-button"
              onClick={() => setModalOpen(true)}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Confirm Readiness'}
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
              <button className="close-modal-btn" onClick={closeEditModal}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="edit-modal-content">
              {/* Add New Item Section */}
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
                  <label>Item Name (e.g., "Firetruck Operational")</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => handleLabelChange(e.target.value, setNewItemName)}
                    placeholder="Enter item name"
                  />
                </div>
                <button className="add-item-btn" onClick={addChecklistItem} disabled={loading}>
                  {loading ? 'Adding...' : 'Add Item'}
                </button>
              </div>

              {/* Edit Existing Item Section */}
              {editingItem && (
                <div className="edit-item-section">
                  <h4>Edit Item</h4>
                  <div className="form-group">
                    <label>Item Name</label>
                    <input
                      type="text"
                      value={editItemName}
                      onChange={(e) => handleLabelChange(e.target.value, setEditItemName)}
                      placeholder="Enter item name"
                    />
                  </div>
                  <div className="edit-actions">
                    <button className="save-item-btn" onClick={updateChecklistItem}>
                      Save Changes
                    </button>
                    <button
                      className="cancel-edit-btn"
                      onClick={() => {
                        setEditingItem(null);
                        setEditItemName('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Current Items Section */}
              <div className="current-items-section">
                <h4>Equipment Checklist</h4>
                <div className="items-list">
                  {equipmentItems.map(([key, label]) => (
                    <div key={key} className="item-row">
                      <span className="item-key">{key}</span>
                      <span className="item-label">{label}</span>
                      <div className="item-actions">
                        <button className="item-edit-btn" onClick={() => openEditModal(key, label)}>
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

                <h4 style={{ marginTop: '24px' }}>Personnel & Station</h4>
                <div className="items-list">
                  {personnelItems.map(([key, label]) => (
                    <div key={key} className="item-row">
                      <span className="item-key">{key}</span>
                      <span className="item-label">{label}</span>
                      <div className="item-actions">
                        <button className="item-edit-btn" onClick={() => openEditModal(key, label)}>
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

      {/* Submit Confirmation Modal */}
      {modalOpen && (
        <ConfirmModal
          title="Submit Readiness?"
          message={`Your station status is "${finalStatus.replace(/_/g, ' ')}" with ${readinessPercentage}% readiness. Submit to Headquarters?`}
          onConfirm={submitReadiness}
          onCancel={() => setModalOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
      )}
    </div>
  );
}
