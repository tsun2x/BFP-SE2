/**
 * IncidentReportModal
 * - Shows a form to submit a formal incident report (saved to incident_reports table)
 * - Also provides Download PDF and Download DOCX buttons
 */
import { useState, useEffect } from 'react';
import { apiCall } from '../utils/apiClient';
import { downloadPDF, downloadDOCX } from '../utils/generateIncidentReport';

export default function IncidentReportModal({ alarmId, onClose }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null); // 'pdf' | 'docx'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    incident_type: '',
    narrative: '',
    injuries_reported: 0,
    deaths_reported: 0,
    property_affected: '',
  });

  useEffect(() => {
    if (!alarmId) return;
    setLoading(true);
    apiCall(`/incidents/${alarmId}/report-data`)
      .then((data) => {
        setReportData(data);
        if (data.report) {
          setForm({
            incident_type: data.report.incident_type || '',
            narrative: data.report.narrative || '',
            injuries_reported: data.report.injuries_reported ?? 0,
            deaths_reported: data.report.deaths_reported ?? 0,
            property_affected: data.report.property_affected || '',
          });
        } else if (data.alarm) {
          const firstLog = data.timeline?.[0];
          setForm((f) => ({
            ...f,
            incident_type: data.alarm.incident_type || '',
            narrative: firstLog?.details || '',
          }));
        }
      })
      .catch((e) => setError(e.message || 'Failed to load report data'))
      .finally(() => setLoading(false));
  }, [alarmId]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiCall(`/incidents/${alarmId}/submit-report`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSuccess('Report submitted successfully! You can now download it.');
      const fresh = await apiCall(`/incidents/${alarmId}/report-data`);
      setReportData(fresh);
    } catch (e) {
      setError(e.message || 'Failed to submit report');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    setDownloading('pdf');
    try {
      downloadPDF(reportData);
    } catch (e) {
      setError('Failed to generate PDF: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!reportData) return;
    setDownloading('docx');
    try {
      await downloadDOCX(reportData);
    } catch (e) {
      setError('Failed to generate DOCX: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>📋 Incident Report</div>
            <div style={styles.headerSub}>Alarm #{alarmId}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading && <div style={styles.loading}>Loading incident data...</div>}
        {!loading && error && !reportData && <div style={styles.errorBox}>{error}</div>}

        {!loading && reportData && (
          <>
            {/* Alarm summary */}
            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Caller</span>
                <span>{reportData.alarm?.caller_full_name || 'N/A'} — {reportData.alarm?.caller_phone || 'N/A'}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Status</span>
                <span>{reportData.alarm?.status || 'N/A'}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Station</span>
                <span>{reportData.alarm?.station_name || 'N/A'}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Alarm Level</span>
                <span>{reportData.alarm?.current_alarm_level || reportData.alarm?.initial_alarm_level || 'N/A'}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>Incident Type</label>
              <input
                style={styles.input}
                name="incident_type"
                value={form.incident_type}
                onChange={handleChange}
                placeholder="e.g. Structural Fire, Vehicle Accident..."
                required
              />

              <label style={styles.label}>Narrative / Report Details</label>
              <textarea
                style={{ ...styles.input, height: 90, resize: 'vertical' }}
                name="narrative"
                value={form.narrative}
                onChange={handleChange}
                placeholder="Describe what happened, actions taken, outcome..."
                required
              />

              <div style={styles.row3}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Injuries Reported</label>
                  <input
                    style={styles.input}
                    type="number"
                    name="injuries_reported"
                    value={form.injuries_reported}
                    onChange={handleChange}
                    min={0}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Deaths Reported</label>
                  <input
                    style={styles.input}
                    type="number"
                    name="deaths_reported"
                    value={form.deaths_reported}
                    onChange={handleChange}
                    min={0}
                  />
                </div>
              </div>

              <label style={styles.label}>Property Affected</label>
              <input
                style={styles.input}
                name="property_affected"
                value={form.property_affected}
                onChange={handleChange}
                placeholder="e.g. 2-storey residential, estimated damage ₱500,000..."
              />

              {error && <div style={styles.errorBox}>{error}</div>}
              {success && <div style={styles.success}>{success}</div>}

              <button style={styles.submitBtn} type="submit" disabled={saving}>
                {saving ? 'Saving...' : reportData.report ? '💾 Update Report' : '💾 Submit Report'}
              </button>
            </form>

            {/* Download buttons — always visible */}
            <div style={styles.downloadRow}>
              <button
                style={styles.pdfBtn}
                onClick={handleDownloadPDF}
                disabled={!!downloading}
              >
                {downloading === 'pdf' ? 'Generating...' : '📄 Download PDF'}
              </button>
              <button
                style={styles.docxBtn}
                onClick={handleDownloadDOCX}
                disabled={!!downloading}
              >
                {downloading === 'docx' ? 'Generating...' : '📝 Download DOCX'}
              </button>
            </div>
            {!reportData.report && (
              <div style={styles.hint}>
                💡 Submit the report first to include full details in the download.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    background: '#1a1a2e', color: '#e0e0e0', borderRadius: 12,
    width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)', padding: 0,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    background: '#c81e1e', padding: '16px 20px', borderRadius: '12px 12px 0 0',
  },
  headerTitle: { fontSize: 18, fontWeight: 700, color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  closeBtn: {
    background: 'none', border: 'none', color: '#fff', fontSize: 20,
    cursor: 'pointer', lineHeight: 1, padding: 4,
  },
  loading: { padding: 32, textAlign: 'center', color: '#aaa' },
  summaryBox: {
    background: '#0f0f1e', margin: '16px 20px 0', borderRadius: 8,
    padding: '12px 16px', fontSize: 13,
  },
  summaryRow: { display: 'flex', gap: 10, marginBottom: 4 },
  summaryLabel: { fontWeight: 700, minWidth: 100, color: '#c81e1e' },
  form: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: 12, fontWeight: 600, color: '#bbb', marginBottom: 2 },
  input: {
    background: '#0f0f1e', border: '1px solid #333', borderRadius: 6,
    color: '#e0e0e0', padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box',
  },
  row3: { display: 'flex', gap: 12 },
  submitBtn: {
    background: '#c81e1e', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4,
  },
  downloadRow: {
    display: 'flex', gap: 12, padding: '0 20px 12px',
  },
  pdfBtn: {
    flex: 1, background: '#1565c0', color: '#fff', border: 'none',
    borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  docxBtn: {
    flex: 1, background: '#2e7d32', color: '#fff', border: 'none',
    borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  hint: {
    padding: '0 20px 16px', fontSize: 12, color: '#888', textAlign: 'center',
  },
  errorBox: {
    background: '#3b0000', color: '#ff6b6b', borderRadius: 6,
    padding: '8px 12px', fontSize: 13, margin: '0 20px',
  },
  success: {
    background: '#003b00', color: '#6bff6b', borderRadius: 6,
    padding: '8px 12px', fontSize: 13,
  },
};
