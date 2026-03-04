import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../style/content.css'

function EmergencyContact() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([
    { id: 1, category: 'BFP District 1', station: 'BFP Zamboanga Central', hotline: '0935-123-4567', location: 'Tetuan' },
    { id: 2, category: 'BFP District 2', station: 'BFP Ayala Substation', hotline: '0936-876-3210', location: 'Ayala' },
    { id: 3, category: 'Medical', station: 'Zamboanga City Medical Center', hotline: '0917-234-6789', location: 'Veterans Ave.' },
  ])
  const [ecForm, setEcForm] = useState({ category: '', station: '', hotline: '', location: '' })
  const [ecSearch, setEcSearch] = useState('')
  const [editingId, setEditingId] = useState(null)

  const onEcChange = (e) => setEcForm({ ...ecForm, [e.target.name]: e.target.value })
  const resetEcForm = () => { setEcForm({ category: '', station: '', hotline: '', location: '' }); setEditingId(null) }
  const saveContact = (e) => {
    e.preventDefault()
    if (!ecForm.category || !ecForm.station || !ecForm.hotline || !ecForm.location) return
    if (editingId) {
      setContacts((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...ecForm } : c)))
    } else {
      const nextId = contacts.length ? Math.max(...contacts.map((c) => c.id)) + 1 : 1
      setContacts((prev) => [...prev, { id: nextId, ...ecForm }])
    }
    resetEcForm()
  }
  const editContact = (c) => { setEditingId(c.id); setEcForm({ category: c.category, station: c.station, hotline: c.hotline, location: c.location }) }
  const deleteContact = (id) => setContacts((prev) => prev.filter((c) => c.id !== id))
  const filteredContacts = contacts.filter((c) => {
    const q = ecSearch.toLowerCase()
    return [c.category, c.station, c.hotline, c.location].some((v) => v.toLowerCase().includes(q))
  })

  return (
    <div className="cm-wrapper">
      <div className="cm-header">
        <h1 className="cm-title">Content Management</h1>
      </div>

       <div className="cm-tabs">
        <button className={`cm-tab ${activeTab === 'news' ? 'cm-tab-active' : ''}`} onClick={() => setActiveTab('news')}>News Room</button>
        <button className={`cm-tab ${activeTab === 'safety' ? 'cm-tab-active' : ''}`} onClick={() => setActiveTab('safety')}>Safety Tips</button>
        <button className={`cm-tab ${activeTab === 'contacts' ? 'cm-tab-active' : ''}`} onClick={() => setActiveTab('contacts')}>Emergency Contacts</button>
      </div>

      <div className="cm-card">
        <div className="cm-card-head">
          <div className="cm-card-title">
            <h2>Emergency Contacts</h2>
            <p>For updating and managing official contact numbers and emergency hotlines</p>
          </div>
        </div>

        <div className="cm-search" style={{ marginTop: 8 }}>
          <span className="cm-search-icon" />
          <input className="cm-search-input" placeholder="Search" value={ecSearch} onChange={(e)=>setEcSearch(e.target.value)} />
        </div>

        <div className="ec-form">
          <form onSubmit={saveContact}>
            <div className="ec-grid">
              <div className="ec-field">
                <label>Category</label>
                <input className="ec-input" name="category" value={ecForm.category} onChange={onEcChange} placeholder="Value" />
              </div>
              <div className="ec-field">
                <label>Station</label>
                <input className="ec-input" name="station" value={ecForm.station} onChange={onEcChange} placeholder="Value" />
              </div>
              <div className="ec-field">
                <label>Hot-line Number</label>
                <input className="ec-input" name="hotline" value={ecForm.hotline} onChange={onEcChange} placeholder="Value" />
              </div>
            </div>
            <div className="ec-grid">
              <div className="ec-field ec-field--wide">
                <label>Location</label>
                <input className="ec-input" name="location" value={ecForm.location} onChange={onEcChange} placeholder="Value" />
              </div>
              <div className="ec-actions">
                <button type="submit" className="cm-small-btn cm-small-btn--outline">{editingId ? 'Update Contact' : 'Save Contact'}</button>
                {editingId && (<button type="button" className="cm-small-btn" onClick={resetEcForm}>Cancel</button>)}
              </div>
            </div>
          </form>
        </div>

        <div className="ec-table">
          <div className="ec-thead">
            <div className="ec-th">Category</div>
            <div className="ec-th">Station</div>
            <div className="ec-th">Hotline Number</div>
            <div className="ec-th">Location</div>
            <div className="ec-th ec-th-actions">Actions</div>
          </div>
          <div className="ec-tbody">
            {filteredContacts.map((c) => (
              <div key={c.id} className="ec-tr">
                <div className="ec-td">{c.category}</div>
                <div className="ec-td">{c.station}</div>
                <div className="ec-td">{c.hotline}</div>
                <div className="ec-td">{c.location}</div>
                <div className="ec-td ec-row-actions">
                  <button className="cm-btn cm-btn--dark" onClick={()=>editContact(c)}>Edit</button>
                  <button className="cm-btn cm-btn--danger" onClick={()=>deleteContact(c.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmergencyContact
