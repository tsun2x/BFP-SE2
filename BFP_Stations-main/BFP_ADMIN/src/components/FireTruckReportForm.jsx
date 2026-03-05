import React, { useState } from 'react';
import '../style/reports.css';

export default function FireTruckReportForm({ onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    driverName: '',
    reportType: 'status',
    message: '',
    location: ''
  });

  const reportTypes = [
    { value: 'fire-ok', label: '🔥 Fire OK', color: '#f59e0b' },
    { value: 'need-backup', label: '🚨 Need Backup', color: '#ef4444' },
    { value: 'emergency', label: '🆘 Emergency', color: '#dc2626' },
    { value: 'status', label: '📋 Status Update', color: '#3b82f6' },
    { value: 'arrived', label: '📍 Arrived on Scene', color: '#10b981' },
    { value: 'cleared', label: '✅ Scene Cleared', color: '#10b981' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.driverName && formData.message) {
      onSubmit({
        ...formData,
        timestamp: new Date().toISOString(),
        id: Date.now()
      });
      setFormData({ driverName: '', reportType: 'status', message: '', location: '' });
    }
  };

  return (
    <div className="fire-truck-report-modal">
      <div className="fire-truck-report-card">
        <div className="fire-truck-report-header">
          <h2>🚒 Fire Truck Driver Quick Report</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="fire-truck-report-form">
          <div className="form-row">
            <div className="form-item">
              <label>Driver Name</label>
              <input
                type="text"
                value={formData.driverName}
                onChange={(e) => setFormData({...formData, driverName: e.target.value})}
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="form-item">
              <label>Report Type</label>
              <select
                value={formData.reportType}
                onChange={(e) => setFormData({...formData, reportType: e.target.value})}
                required
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-item">
            <label>Location (Optional)</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="Current location or address"
            />
          </div>

          <div className="form-item">
            <label>Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="Describe the situation..."
              rows={4}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Send Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
