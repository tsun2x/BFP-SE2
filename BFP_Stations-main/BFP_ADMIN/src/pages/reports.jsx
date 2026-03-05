// File: Reports.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../style/reports.css';
import ConfirmModal from '../components/ConfirmModal';
import apiClient from '../utils/apiClient';

const sampleReports = [
  {
    id: 1,
    name: "North Substation",
    subject: "Structure Fire - Commercial Building",
    preview: "123 Main Street, 2-story commercial building fire...",
    date: "Jan 15, 2025",
    full: "Full report content for North Substation...",
    email: "john.smith@caller.bfp.local",
    read: false,
  },
  {
    id: 2,
    name: "East Substation",
    subject: "Medical Emergency - Cardiac Arrest",
    preview: "45 Oak Avenue, patient experiencing cardiac arrest...",
    date: "Jan 14, 2025",
    full: "Full report content for East Substation...",
    email: "mary.johnson@caller.bfp.local",
    read: true,
  },
  {
    id: 3,
    name: "Central Substation",
    subject: "Vehicle Accident - Highway Collision",
    preview: "Highway 101, multi-vehicle collision involving 3 cars...",
    date: "Jan 13, 2025",
    full: "Full report content for Central Substation...",
    email: "robert.davis@caller.bfp.local",
    read: false,
  }
];

// Placeholder Modal
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function ComposeForm({ stations, onSend, onClose }) {
  const [recipientStationId, setRecipientStationId] = useState('');
  const [officers, setOfficers] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [officersError, setOfficersError] = useState('');
  const [recipientOfficerId, setRecipientOfficerId] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    async function loadOfficers() {
      setOfficers([]);
      setRecipientOfficerId('');
      setSendToAll(false);
      setOfficersError('');
      if (!recipientStationId) return;
      setOfficersLoading(true);
      try {
        // Call the primary backend endpoint that exists: /api/officers?station_id=ID
        const res = await apiClient.get(`/officers?station_id=${recipientStationId}`);
        // Accept multiple response shapes
        const potential = res?.officers || res?.users || res?.data || res?.rows || res || [];
        const list = Array.isArray(potential) ? potential : [];
        setOfficers(list);
      } catch (e) {
        // Show a clear error so the UI can indicate why officers are missing
        // eslint-disable-next-line no-console
        console.warn('failed to load officers', e && e.message);
        setOfficers([]);
        setOfficersError(e && e.message ? String(e.message) : 'Failed to load officers');
      } finally {
        setOfficersLoading(false);
      }
    }
    loadOfficers();
  }, [recipientStationId]);

  return (
    <div className="composer-form">
      <div className="composer-fields">
        <select
          className="filter-dropdown composer-to"
          value={recipientStationId}
          onChange={(e) => setRecipientStationId(e.target.value)}
        >
          <option value="">To (Select station)</option>
          {(stations || []).map((s) => (
            <option key={s.station_id} value={String(s.station_id)}>
              {s.station_name}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="search-input composer-subject"
          placeholder="Subject (optional)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {officersLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading officers...</div>
        ) : (
          <>
            <select
              className="filter-dropdown"
              value={recipientOfficerId}
              onChange={(e) => setRecipientOfficerId(e.target.value)}
              disabled={sendToAll || (Array.isArray(officers) && officers.length === 0)}
            >
              <option value="">{Array.isArray(officers) && officers.length > 0 ? 'Select officer (optional)' : 'No officers found'}</option>
              {Array.isArray(officers) && officers.map((o) => (
                <option key={o.user_id || o.id} value={String(o.user_id || o.id)}>{o.full_name || o.name || o.email}</option>
              ))}
            </select>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={sendToAll} onChange={(e) => setSendToAll(e.target.checked)} />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Send to all officers</span>
            </label>
          </>
        )}
          {officersError && <div style={{ color: '#c33', fontSize: 13, marginTop: 8 }}>{officersError}</div>}
      </div>

      <textarea
        className="composer-textarea"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message..."
      />

      <div className="composer-toolbar">
        <div className="composer-left">
          <button type="button" className="btn btn-secondary" title="Attach">📎</button>
          <button type="button" className="btn btn-secondary" title="Emoji">😊</button>
          <button type="button" className="btn btn-secondary" title="Formatting">A</button>
        </div>
        <div className="composer-right">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary composer-send"
            onClick={() => onSend({ recipientStationId, recipientOfficerId, sendToAll, subject, body })}
            disabled={!recipientStationId || (!sendToAll && !recipientOfficerId) || !body.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Gmail-style Compose Window Component
function ComposeWindow({ isOpen, onClose, onSend, stations, replyTo = null }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [formData, setFormData] = useState({
    recipient: replyTo?.email || '',
    subject: replyTo ? `Re: ${replyTo.subject}` : '',
    body: ''
  });
  
  // Station and officer selection states
  const [recipientStationId, setRecipientStationId] = useState('');
  const [officers, setOfficers] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [officersError, setOfficersError] = useState('');
  const [recipientOfficerId, setRecipientOfficerId] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [recipientType, setRecipientType] = useState('station'); // 'station' or 'fire-truck'
  
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  
  const windowRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Load officers when station is selected
  useEffect(() => {
    async function loadOfficers() {
      setOfficers([]);
      setRecipientOfficerId('');
      setSendToAll(false);
      setOfficersError('');
      if (!recipientStationId) return;
      setOfficersLoading(true);
      try {
        const res = await apiClient.get(`/officers?station_id=${recipientStationId}`);
        const potential = res?.officers || res?.users || res?.data || res?.rows || res || [];
        const list = Array.isArray(potential) ? potential : [];
        setOfficers(list);
      } catch (e) {
        console.warn('failed to load officers', e && e.message);
        setOfficers([]);
        setOfficersError(e && e.message ? String(e.message) : 'Failed to load officers');
      } finally {
        setOfficersLoading(false);
      }
    }
    loadOfficers();
  }, [recipientStationId]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      id: Date.now() + Math.random()
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSend = () => {
    if (replyTo) {
      // Reply mode - can reply to original sender or different officer
      if (formData.body.trim()) {
        if (sendToAll && recipientOfficerId) {
          // Reply to different officer
          onSend({
            recipientStationId: recipientStationId || replyTo.station_id,
            recipientOfficerId,
            sendToAll: false, // Not sending to all, just specific officer
            subject: formData.subject,
            body: formData.body,
            attachments: attachments,
            replyTo: replyTo
          });
        } else {
          // Reply to original sender
          onSend(formData.body);
        }
        // Reset form
        setRecipientStationId('');
        setRecipientOfficerId('');
        setSendToAll(false);
        setFormData({ recipient: '', subject: '', body: '' });
        setAttachments([]);
        onClose();
      }
    } else {
      // Compose mode - validate station and recipient
      if (recipientStationId && (sendToAll || recipientOfficerId) && formData.body.trim()) {
        onSend({
          recipientStationId,
          recipientOfficerId,
          sendToAll,
          subject: formData.subject,
          body: formData.body,
          attachments: attachments,
          replyTo: replyTo
        });
        // Reset form
        setRecipientStationId('');
        setRecipientOfficerId('');
        setSendToAll(false);
        setFormData({ recipient: '', subject: '', body: '' });
        setAttachments([]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={windowRef}
      className={`compose-window ${isMinimized ? 'minimized' : ''}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000
      }}
    >
      <div
        className="compose-window-header"
        onMouseDown={handleMouseDown}
      >
        <div className="compose-window-title">
          {replyTo ? 'Reply to Message' : 'New Message'}
        </div>
        <div className="compose-window-controls">
          <button
            className="compose-window-control minimize"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          />
          <button
            className="compose-window-control close"
            onClick={onClose}
            title="Close"
          />
        </div>
      </div>
      
      <div className="compose-window-body">
        <div className="compose-field">
          <label>To</label>
          {replyTo ? (
            <div style={{ 
              padding: '10px 12px', 
              border: '1px solid var(--border)', 
              borderRadius: '6px',
              background: '#f8fafc',
              color: '#1e293b',
              fontSize: '14px'
            }}>
              {replyTo.email || replyTo.name || 'Original Sender'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                className="filter-dropdown"
                value={recipientType}
                onChange={(e) => {
                  setRecipientType(e.target.value);
                  setRecipientStationId('');
                  setRecipientOfficerId('');
                  setSendToAll(false);
                }}
              >
                <option value="station">Station</option>
                <option value="fire-truck">Fire Truck Driver</option>
              </select>
              
              {recipientType === 'station' && (
                <select
                  className="filter-dropdown"
                  value={recipientStationId}
                  onChange={(e) => setRecipientStationId(e.target.value)}
                >
                  <option value="">Select station</option>
                  {(stations || []).map((s) => (
                    <option key={s.station_id} value={String(s.station_id)}>
                      {s.station_name}
                    </option>
                  ))}
                </select>
              )}
              
              {recipientType === 'fire-truck' && (
                <select
                  className="filter-dropdown"
                  value={recipientOfficerId}
                  onChange={(e) => setRecipientOfficerId(e.target.value)}
                >
                  <option value="">Select fire truck driver</option>
                  <option value="driver-001">John Martinez - Unit 1</option>
                  <option value="driver-002">Mike Johnson - Unit 2</option>
                  <option value="driver-003">Sarah Chen - Unit 3</option>
                </select>
              )}
              
              {recipientType === 'station' && recipientStationId && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={sendToAll}
                      onChange={(e) => {
                        setSendToAll(e.target.checked);
                        if (e.target.checked) setRecipientOfficerId('');
                      }}
                    />
                    <span style={{ color: 'var(--muted)' }}>Send to all officers</span>
                  </label>
                  
                  {!sendToAll && (
                    <select
                      className="filter-dropdown"
                      value={recipientOfficerId}
                      onChange={(e) => setRecipientOfficerId(e.target.value)}
                      style={{ marginTop: 4 }}
                    >
                      <option value="">Select officer (optional)</option>
                      {Array.isArray(officers) && officers.map((o) => (
                        <option key={o.user_id || o.id} value={String(o.user_id || o.id)}>
                          {o.full_name || o.name || o.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="compose-field">
          <label>Subject</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
            placeholder="Report subject"
          />
        </div>
        
        <div className="compose-field">
          <label>Message</label>
          <textarea
            value={formData.body}
            onChange={(e) => setFormData({...formData, body: e.target.value})}
            placeholder="Type your message here..."
          />
        </div>

        {/* File Attachments */}
        <div className="compose-field">
          <label>Attachments</label>
          <div className="attachment-area">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <button 
              className="attachment-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fa-solid fa-paperclip"></i> Attach Files
            </button>
            
            {attachments.length > 0 && (
              <div className="attachments-list">
                {attachments.map(att => (
                  <div key={att.id} className="attachment-item">
                    <div className="attachment-info">
                      <i className="fa-solid fa-file"></i>
                      <span className="attachment-name">{att.name}</span>
                      <span className="attachment-size">
                        {att.size < 1024 * 1024 
                          ? `${(att.size / 1024).toFixed(1)} KB`
                          : `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                        }
                      </span>
                    </div>
                    <button 
                      className="attachment-remove"
                      onClick={() => removeAttachment(att.id)}
                      title="Remove attachment"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="compose-actions">
          <button className="compose-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="compose-btn send" 
            onClick={handleSend}
            disabled={
              replyTo 
                ? !formData.body.trim() || (sendToAll && !recipientOfficerId)  // Reply mode: need message body, and officer if checkbox is checked
                : !recipientStationId || (!sendToAll && !recipientOfficerId) || !formData.body.trim()  // Compose mode: need station, recipient, and message
            }
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
function ReplyForm({ to, onSend, onClose }) {
  const [text, setText] = useState('');
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <strong>To:</strong> {to?.name || to?.email || 'Unknown Sender'}
        {to?.type === 'fire-truck-report' && (
          <span style={{ marginLeft: 8, color: '#ef4444', fontSize: 12 }}>
            🚒 Fire Truck Driver
          </span>
        )}
        <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
          {to?.type === 'fire-truck-report' 
            ? `Replying to Fire Truck Driver at ${to?.location || 'Unknown location'}`
            : `Replying to ${to?.name || to?.email || 'Unknown Sender'}`
          }
        </div>
      </div>
      <textarea
        className="reply-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your reply..."
      />
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { onSend(text); setText(''); }}>Send</button>
      </div>
    </div>
  );
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, id: null, type: null });
  const [replyModal, setReplyModal] = useState({ open: false, to: null });
  const [composeModal, setComposeModal] = useState({ open: false });
  const [stations, setStations] = useState([]);
  const [threadMessages, setThreadMessages] = useState([]);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);

  const selected = reports.find(r => r.id === selectedId) || null;

  const formatDate = (isoOrDateString) => {
    if (!isoOrDateString) return '';
    const d = new Date(isoOrDateString);
    if (Number.isNaN(d.getTime())) return String(isoOrDateString);
    return d.toLocaleString();
  };

  const loadConversations = async () => {
    try {
      // Load regular conversations
      const data = await apiClient.get('/conversations');
      const conversations = data?.conversations || [];
      const mapped = conversations.map((c) => {
        const last = c.lastMessage || null;
        const preview = last?.body ? String(last.body).slice(0, 80) : '';
        return {
          id: c.conversationId,
          conversationId: c.conversationId,
          name: c.otherStationName || c.stationBName || c.stationAName || 'Station',
          subject: last?.subject || '(No report)',
          preview,
          date: last?.sent_at || c.updatedAt || null,
          full: last?.body || '',
          email: '',
          read: last ? Boolean(last.is_read) : true,
          type: 'message', // Regular message type
        };
      });

      // Load fire truck driver reports from their app
      let fireTruckReports = [];
      try {
        const fireTruckData = await apiClient.get('/fire-truck-reports');
        fireTruckReports = (fireTruckData?.reports || []).map((report) => ({
          id: `fire-truck-${report.id}`,
          conversationId: report.conversationId || null,
          name: `Fire Truck Driver - ${report.driverName || 'Unknown'}`,
          subject: report.subject || report.reportType || 'Fire Truck Report',
          preview: report.message ? String(report.message).slice(0, 80) : '',
          date: report.createdAt || report.timestamp || null,
          full: report.message || '',
          email: report.driverEmail || '',
          read: Boolean(report.is_read),
          type: 'fire-truck-report', // Fire truck driver report type
          reportType: report.reportType || 'status',
          location: report.location || '',
          stationId: report.stationId,
        }));
      } catch (fireTruckError) {
        console.warn('Failed to load fire truck reports:', fireTruckError);
        
        // Add example fire truck driver message for demo purposes
        const now = new Date();
        fireTruckReports = [{
          id: 'fire-truck-example-001',
          conversationId: null,
          name: 'Fire Truck Driver - John Martinez',
          subject: 'Need Backup - Structure Fire',
          preview: '2-story residential building fully involved, need additional engine company and ladder truck...',
          date: now.toISOString(),
          full: '2-story residential building fully involved, fire spreading to adjacent structure. Need additional engine company and ladder truck immediately. Multiple families may be trapped. Location: Main Street & Oak Avenue. Coordinates: 14.6092, 120.9842. Requesting mutual aid from neighboring stations.',
          email: 'john.martinez@firedept.gov',
          read: false,
          type: 'fire-truck-report',
          reportType: 'need-backup',
          location: 'Main Street & Oak Avenue, District 5',
          stationId: 1,
        }];
      }

      // Merge both types and sort by date (newest first)
      const allReports = [...mapped, ...fireTruckReports].sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      });

      setReports(allReports);
      setFilteredReports(allReports);
      // Do not auto-select a message on initial load — keep list-only view
      if (!allReports.find((r) => r.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (e) {
      setReports([]);
      setFilteredReports([]);
      setSelectedId(null);
    }
  };

  const loadThread = async (conversationId) => {
    if (!conversationId) {
      setThreadMessages([]);
      return;
    }
    try {
      const data = await apiClient.get(`/conversations/${conversationId}/messages`);
      setThreadMessages(data?.messages || []);
    } catch (e) {
      setThreadMessages([]);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadThread(selectedId);
    } else {
      setThreadMessages([]);
    }
  }, [selectedId]);

  // Filter logic
  useEffect(() => {
    let filtered = [...reports];

    // Search
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.date.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter type
    if (filterType === 'unread') filtered = filtered.filter(r => !r.read);
    else if (filterType === 'read') filtered = filtered.filter(r => r.read);
    else if (filterType === 'fire-truck') filtered = filtered.filter(r => r.type === 'fire-truck-report');
    else if (filterType === 'recent') filtered = filtered.sort((a,b)=> new Date(b.date) - new Date(a.date));
    // 'all' shows everything

    setFilteredReports(filtered);
    // If the currently selected item is no longer in the filtered list,
    // clear selection instead of auto-selecting the first item.
    if (!filtered.find(r => r.id === selectedId)) setSelectedId(null);
  }, [searchTerm, filterType, reports]);

  // Handlers
  const openConfirm = (id, type) => setConfirmState({ open:true, id, type });
  const performConfirm = () => {
    const { id } = confirmState;
    if (!id) return;
    if (confirmState.type === 'delete') {
      apiClient
        .delete(`/conversations/${id}`)
        .then(() => loadConversations())
        .catch(() => loadConversations());
    }
    if (selectedId === id) setSelectedId(null);
    setConfirmState({ open:false, id:null, type:null });
  };
  const openReply = (report) => setReplyModal({ open:true, to:report });
  const sendReply = async (text) => {
    const conversationId = replyModal?.to?.conversationId || replyModal?.to?.id || null;
    if (!conversationId) {
      setReplyModal({ open:false, to:null });
      return;
    }
    try {
      await apiClient.post(`/conversations/${conversationId}/messages`, { body: text, subject: null });
      setReplyModal({ open:false, to:null });
      await loadThread(conversationId);
      await loadConversations();
    } catch (e) {
      setReplyModal({ open:false, to:null });
    }
  };

  useEffect(() => {
    async function loadStations() {
      try {
        const data = await apiClient.get('/firestations');
        const all = data?.stations || [];
        const me = (() => {
          try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
        })();
        const myStationId = me?.assignedStationId || me?.assigned_station_id || me?.stationInfo?.station_id || null;
        const filtered = myStationId
          ? all.filter((s) => String(s.station_id) !== String(myStationId))
          : all;
        setStations(filtered);
      } catch (e) {
        setStations([]);
      }
    }

    if (composeModal.open) {
      loadStations();
    }
  }, [composeModal.open]);

  const sendNewMessage = async ({ recipientStationId, recipientOfficerId, sendToAll, subject, body }) => {
    try {
      const payload = {
        recipientStationId: Number(recipientStationId),
        recipientOfficerId: recipientOfficerId ? Number(recipientOfficerId) : null,
        sendToAll: Boolean(sendToAll),
        subject: subject?.trim() ? subject.trim() : null,
        body: body,
      };
      const res = await apiClient.post('/conversations', payload);
      setComposeModal({ open: false });
      console.log('Message sent:', res);
      await loadConversations();
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  return (
    <div className="reports-page">
      <div className="inbox-wrapper">

        {/* LEFT */}
        <aside className={`inbox-left ${selectedId ? 'has-selected' : ''}`}>
          <div className="inbox-left-header">
            <div className="inbox-header-content">
              <h2><i className="fa-solid fa-inbox"></i> Inbox</h2>
              <div className="search-and-filter">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    className="search-input"
                    onChange={(e)=>setSearchTerm(e.target.value)}
                  />
                  <i className="fa-solid fa-magnifying-glass search-icon"></i>
                </div>
                <button className="btn btn-primary compose-btn" onClick={() => setComposeModal({ open: true })}>
                  <i className="fa-solid fa-pen-to-square"></i> Compose
                </button>
              </div>
            </div>
            <div className="filter-section">
              <div className="filter-buttons">
                <button className={`filter-btn ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>
                  <i className="fa-solid fa-inbox"></i> All
                </button>
                <button className={`filter-btn ${filterType === 'unread' ? 'active' : ''}`} onClick={() => setFilterType('unread')}>
                  <i className="fa-solid fa-envelope"></i> Unread
                </button>
                <button className={`filter-btn ${filterType === 'fire-truck' ? 'active' : ''}`} onClick={() => setFilterType('fire-truck')}>
                  <i className="fa-solid fa-truck-fire"></i> Fire Truck
                </button>
                <button className={`filter-btn ${filterType === 'spam' ? 'active' : ''}`} onClick={() => setFilterType('spam')}>
                  <i className="fa-solid fa-shield-halved"></i> Spam
                </button>
                <div className="filter-dropdown-wrapper">
                  <button className="filter-dropdown-btn" onClick={() => setShowMoreDropdown(!showMoreDropdown)}>
                    <i className="fa-solid fa-ellipsis-vertical"></i>
                  </button>
                  {showMoreDropdown && (
                    <div className="filter-dropdown-menu">
                      <button onClick={() => { setFilterType('recent'); setShowMoreDropdown(false); }}>
                        <i className="fa-solid fa-clock"></i> Recent
                      </button>
                      <button onClick={() => { setFilterType('read'); setShowMoreDropdown(false); }}>
                        <i className="fa-solid fa-envelope-open"></i> Read
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="inbox-list">
            {filteredReports.length === 0 ? <div className="empty-state">No reports found</div> :
              filteredReports.map(r => (
                <div
                  key={r.id}
                  className={`inbox-item ${selectedId === r.id ? 'active' : ''} ${r.type === 'fire-truck-report' ? 'fire-truck-item' : ''}`}
                  onClick={()=>setSelectedId(r.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e)=> e.key==='Enter' && setSelectedId(r.id)}
                >
                  <div className="item-left">
                    <div className="avatar">
                      <i className={`fa-solid ${r.type === 'fire-truck-report' ? 'fa-truck-fire' : 'fa-file-lines'}`}></i>
                    </div>
                    {!r.read && <div className="unread-indicator"><i className="fa-solid fa-circle"></i></div>}
                  </div>
                  <div className="item-body">
                    <div className="item-top">
                      <div className="item-name">{r.name}</div>
                      <div className="item-date">{formatDate(r.date)}</div>
                    </div>
                    <div className="item-subject">{r.subject}</div>
                    <div className="item-preview">{r.preview}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </aside>

        {/* RIGHT */}
        <section className="inbox-right">
          {selected && (
            <div className="message-card">
              <div className="message-card-header">
                <h2 className="subject">{selected.subject}</h2>
                <div className="message-controls">
                  <button className="gmail-btn archive-btn" onClick={()=>openConfirm(selected.id,'archive')} title="Archive message">
                    <i className="fa-solid fa-archive"></i>
                  </button>
                  <button className="gmail-btn delete-btn" onClick={()=>openConfirm(selected.id,'delete')} title="Delete message">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                  <button className="gmail-btn reply-btn" onClick={()=>openReply(selected)} title="Reply to message">
                    <i className="fa-solid fa-reply"></i>
                  </button>
                  <button className="back-button-content" onClick={()=>setSelectedId(null)}><i className="fa-solid fa-arrow-left"></i> Back</button>
                </div>
              </div>

              <div className="message-sender">
                <div className="sender-avatar">
                  <i className={`fa-solid ${selected.type === 'fire-truck-report' ? 'fa-truck-fire' : 'fa-building'}`}></i>
                </div>
                <div className="sender-meta">
                  <div className="sender-name">{selected.name}</div>
                  <div className="sender-email">{formatDate(selected.date)}</div>
                  {selected.type === 'fire-truck-report' && selected.location && (
                    <div className="sender-location">
                      <i className="fa-solid fa-location-dot"></i> {selected.location}
                    </div>
                  )}
                </div>
              </div>

              <div className="message-content">
                {(threadMessages && threadMessages.length > 0
                  ? threadMessages
                  : [{ message_id: 'fallback', body: selected.full, sent_at: selected.date }]
                ).map((m) => (
                  <p key={m.message_id}>
                    {String(m.body || '').split('\n').map((para, idx) => (
                      <span key={idx}>
                        {para}
                        <br />
                      </span>
                    ))}
                  </p>
                ))}
              </div>

                          </div>
          )}
        </section>
      </div>

      {/* Modals */}
      {confirmState.open && (
        <ConfirmModal
          title={confirmState.type==='delete'?'Delete Report':'Archive Report'}
          message={confirmState.type==='delete'?'Are you sure you want to permanently delete this report?':'Archive this report? It will be removed from the inbox list.'}
          type={confirmState.type}
          onConfirm={performConfirm}
          onCancel={()=>setConfirmState({open:false,id:null,type:null})}
        />
      )}

      {/* Gmail-style Compose Window */}
      <ComposeWindow
        isOpen={composeModal.open}
        onClose={() => setComposeModal({ open: false })}
        onSend={sendNewMessage}
        stations={stations}
      />

      {/* Gmail-style Reply Window */}
      <ComposeWindow
        isOpen={replyModal.open}
        onClose={() => setReplyModal({ open: false, to: null })}
        onSend={sendReply}
        stations={stations}
        replyTo={replyModal.to}
      />
      
      {/* Empty State */}
      {filteredReports.length === 0 && (
        <div className="empty-state-icon">
          <i className="fa-solid fa-inbox"></i>
        </div>
      )}
    </div>
  );
}
