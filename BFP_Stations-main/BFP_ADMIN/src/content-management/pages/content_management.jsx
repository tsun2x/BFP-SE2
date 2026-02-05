import React, { useState, useEffect } from 'react'
import '../style/content.css'
import '../style/newsroom.css'

function ContentManagement() {
  const [openSections, setOpenSections] = useState({ electrical: true, kitchen: false })
  const [showNewsModal, setShowNewsModal] = useState(false)
  const [activeTab, setActiveTab] = useState('safety')
  
  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Open a universal modal for adding tips to any section
  const openGlobalAddTip = () => {
    setSafetyForm({ open: true, section: 'electrical', id: null, task: '', desc: '' })
    setSafetyModalOpen(true)
  }

  // Safety Tips state
  const [safetyTips, setSafetyTips] = useState({
    electrical: [
      { id: 1, task: 'Avoid Overloading Outlets', desc: 'Never plug too many devices into one outlet or……' },
      { id: 2, task: 'Check Wires and Cords Regularly', desc: 'Inspect electrical cords for fraying, cracks, or ………' },
      { id: 3, task: 'If sparks occur', desc: 'Unplug the device if safe, turn off the breaker………' },
    ],
    kitchen: [
      { id: 1, task: 'Keep a Lid Nearby', desc: 'Smother small grease fires by sliding a lid over the pan.' },
      { id: 2, task: 'Stay in the Kitchen', desc: 'Never leave cooking unattended, especially when frying.' },
      { id: 3, task: 'Turn Pot Handles Inward', desc: 'Prevent spills and burns by keeping handles out of reach.' },
      { id: 4, task: 'Keep Flammables Away', desc: 'Keep towels, paper, and packaging at least 3 feet from the stove.' },
      { id: 5, task: 'Have a Fire Extinguisher Nearby', desc: 'Store a Class K or ABC extinguisher in the kitchen and know how to use it.' },
    ],
  })
  
  const [safetySearch, setSafetySearch] = useState('')
  const [safetyForm, setSafetyForm] = useState({ open: false, section: 'electrical', id: null, task: '', desc: '' })
  const [safetyModalOpen, setSafetyModalOpen] = useState(false)

  // News Items state - FIXED: Now using useState
  const [newsItems, setNewsItems] = useState(() => {
    const defaultItems = [
      {
        id: 1,
        title: '"3-Alarm Fire Controlled in ZC"',
        date: 'October 03, 2025',
        image: './news1.jpg',
        headlineImage: './news1.jpg',
      },
      {
        id: 2,
        title: '"Grass Fire Spreads Near Vacant Lot in San Pedro"',
        date: 'October 12, 2025',
        image: './news2.jpeg',
        headlineImage: './news2.jpeg',
      },
      {
        id: 3,
        title: '"Kitchen Fire Contained in San Pedro Residence"',
        date: 'October 19, 2025',
        image: './news3.jpg',
        headlineImage: './news3.jpg',
      },
    ]
    return defaultItems
  })

  // News form state
  const [newsForm, setNewsForm] = useState({
    headlineImage: null,
    title: '',
    description: '',
    author: '',
    additionalImages: []
  })

  const handleHeadlineImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewsForm(prev => ({ ...prev, headlineImage: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeHeadlineImage = () => {
    setNewsForm(prev => ({ ...prev, headlineImage: null }))
  }

  const handleAdditionalImagesUpload = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewsForm(prev => ({
          ...prev,
          additionalImages: [...prev.additionalImages, reader.result]
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  const saveNewsItem = () => {
    if (!newsForm.title.trim()) {
      alert('Please enter a title')
      return
    }
    
    const nextId = newsItems.length ? Math.max(...newsItems.map(n => n.id)) + 1 : 1
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' })
    
    const newItem = {
      id: nextId,
      title: newsForm.title,
      date: today,
      image: newsForm.headlineImage || '/news1.jpg',
      headlineImage: newsForm.headlineImage || '/news1.jpg',
      description: newsForm.description,
      author: newsForm.author,
      additionalImages: newsForm.additionalImages
    }
    
    setNewsItems(prev => [...prev, newItem])
    setNewsForm({
      headlineImage: null,
      title: '',
      description: '',
      author: '',
      additionalImages: []
    })
    setShowNewsModal(false)
  }

  // Persist safety tips to memory (removed localStorage as per guidelines)
  useEffect(() => {
    // Safety tips are now persisted in state only
  }, [])

  // Emergency Contacts state and handlers
  const [contacts, setContacts] = useState([
    { id: 1, category: 'BFP District 1', station: 'BFP Zamboanga Central', hotline: '0935-123-4567', location: 'Tetuan' },
    { id: 2, category: 'BFP District 2', station: 'BFP Ayala Substation', hotline: '0936-876-3210', location: 'Ayala' },
    { id: 3, category: 'Medical', station: 'Zamboanga City Medical Center', hotline: '0917-234-6789', location: 'Veterans Ave.' },
  ])
  
  const [ecForm, setEcForm] = useState({ category: '', station: '', hotline: '', location: '' })
  const [ecSearch, setEcSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [ecModalOpen, setEcModalOpen] = useState(false)
  
  const onEcChange = (e) => setEcForm({ ...ecForm, [e.target.name]: e.target.value })
  const resetEcForm = () => { setEcForm({ category: '', station: '', hotline: '', location: '' }); setEditingId(null); setEcModalOpen(false) }
  
  const saveContact = (e) => {
    if (e) e.preventDefault()
    if (!ecForm.category || !ecForm.station || !ecForm.hotline || !ecForm.location) return
    if (editingId) {
      setContacts((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...ecForm } : c)))
    } else {
      const nextId = contacts.length ? Math.max(...contacts.map((c) => c.id)) + 1 : 1
      setContacts((prev) => [...prev, { id: nextId, ...ecForm }])
    }
    resetEcForm()
  }
  
  const editContact = (c) => { setEditingId(c.id); setEcForm({ category: c.category, station: c.station, hotline: c.hotline, location: c.location }); setEcModalOpen(true) }
  const deleteContact = (id) => setContacts((prev) => prev.filter((c) => c.id !== id))
  
  const filteredContacts = contacts.filter((c) => {
    const q = ecSearch.toLowerCase()
    return [c.category, c.station, c.hotline, c.location].some((v) => v.toLowerCase().includes(q))
  })

  // Safety Tips helpers
  const filterTips = (arr) => {
    const q = safetySearch.toLowerCase()
    if (!q) return arr
    return arr.filter((t) => t.task.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))
  }
  
  const openAddTip = (section) => {
    setSafetyForm({ open: true, section, id: null, task: '', desc: '' })
    setSafetyModalOpen(true)
  }
  
  const openEditTip = (section, tip) => {
    setSafetyForm({ open: true, section, id: tip.id, task: tip.task, desc: tip.desc })
    setSafetyModalOpen(true)
  }
  
  const cancelTip = () => {
    setSafetyForm({ open: false, section: 'electrical', id: null, task: '', desc: '' })
    setSafetyModalOpen(false)
  }
  
  const deleteTip = (section, id) => setSafetyTips((prev) => ({ ...prev, [section]: prev[section].filter((t) => t.id !== id) }))

  const saveTip = (e) => {
    if (e) e.preventDefault()
    const { section, id, task, desc } = safetyForm
    if (!task.trim() || !desc.trim()) return
    setSafetyTips((prev) => {
      const list = [...prev[section]]
      if (id) {
        const idx = list.findIndex((t) => t.id === id)
        if (idx > -1) list[idx] = { ...list[idx], task, desc }
      } else {
        const nextId = list.length ? Math.max(...list.map((t) => t.id)) + 1 : 1
        list.push({ id: nextId, task, desc })
      }
      return { ...prev, [section]: list }
    })
    cancelTip()
  }

  return (
    <>
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
        {activeTab === 'safety' && (
        <>
        <div className="cm-card-head">
          <div className="cm-card-title">
            <h2>Safety Tips management</h2>
            <p>Manage and publish essential fire safety guidelines for public awareness.</p>
          </div>
          <div className="cm-search">
            <span className="cm-search-icon" />
            <input className="cm-search-input" placeholder="Search" value={safetySearch} onChange={(e)=>setSafetySearch(e.target.value)} />
          </div>
          <button className="cm-small-btn cm-small-btn--outline" onClick={openGlobalAddTip}>+ Add Safety tips</button>
        </div>
        <div className="cm-accordion">
          <div className="cm-section">
            <div className="cm-section-bar cm-section-bar--amber">
              <button className="cm-section-toggle" onClick={() => toggleSection('electrical')} aria-expanded={openSections.electrical}>
                <span className={openSections.electrical ? 'cm-caret-down' : 'cm-caret-right'} />
              </button>
              <div className="cm-section-title">
                <strong>Electrical Fire Safety Tips</strong>
                <span className="cm-section-meta">{safetyTips.electrical.length} tasks</span>
              </div>
              <button className="cm-small-btn cm-small-btn--outline" onClick={()=>openAddTip('electrical')}>+ Add Safety tips</button>
            </div>
            {openSections.electrical && (
              <div className="cm-table">
                <div className="cm-thead">
                  <div className="cm-th">Task Name</div>
                  <div className="cm-th">Description</div>
                  <div className="cm-th cm-th-actions">Actions</div>
                </div>
                <div className="cm-tbody">
                  {filterTips(safetyTips.electrical).map((row) => (
                    <div key={`e-${row.id}`} className="cm-tr">
                      <div className="cm-td">{row.task}</div>
                      <div className="cm-td">{row.desc}</div>
                      <div className="cm-td cm-actions">
                        <button className="cm-btn cm-btn--dark" onClick={()=>openEditTip('electrical', row)}>Edit</button>
                        <button className="cm-btn cm-btn--danger" onClick={()=>deleteTip('electrical', row.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="cm-section">
            <div className="cm-section-bar cm-section-bar--mint">
              <button className="cm-section-toggle" onClick={() => toggleSection('kitchen')} aria-expanded={openSections.kitchen}>
                <span className={openSections.kitchen ? 'cm-caret-down' : 'cm-caret-right'} />
              </button>
              <div className="cm-section-title">
                <strong>Kitchen Fire Safety Tips</strong>
                <span className="cm-section-meta">{safetyTips.kitchen.length} tasks</span>
              </div>
              <button className="cm-small-btn cm-small-btn--outline" onClick={()=>openAddTip('kitchen')}>+ Add Safety tips</button>
            </div>
            {openSections.kitchen && (
              <div className="cm-table">
                <div className="cm-thead">
                  <div className="cm-th">Task Name</div>
                  <div className="cm-th">Description</div>
                  <div className="cm-th cm-th-actions">Actions</div>
                </div>
                <div className="cm-tbody">
                  {filterTips(safetyTips.kitchen).map((row) => (
                    <div key={`k-${row.id}`} className="cm-tr">
                      <div className="cm-td">{row.task}</div>
                      <div className="cm-td">{row.desc}</div>
                      <div className="cm-td cm-actions">
                        <button className="cm-btn cm-btn--dark" onClick={()=>openEditTip('kitchen', row)}>Edit</button>
                        <button className="cm-btn cm-btn--danger" onClick={()=>deleteTip('kitchen', row.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </>
        )}
        {activeTab === 'news' && (
          <>
            <div className="nr-list-head">
              <div className="nr-list-title">
                <h2>News Room</h2>
                <p>For posting general articles, announcements, and updates from BFP</p>
              </div>
            </div>
            <div className="nr-list-toolbar">
              <div className="cm-search">
                <span className="cm-search-icon" />
                <input className="cm-search-input" placeholder="Search" />
              </div>
              <button className="cm-small-btn cm-small-btn--outline" onClick={() => setShowNewsModal(true)}>+ Add news</button>
            </div>
            <div className="nr-grid">
              {newsItems.map((n) => (
                <div key={n.id} className="nr-card" onClick={() => setShowNewsModal(true)}>
                  <button className="nr-card-edit" title="Edit" onClick={(e) => { e.stopPropagation(); setShowNewsModal(true); }} />
                  <div className="nr-card-media" style={(n.headlineImage || n.image) ? { backgroundImage: `url(${n.headlineImage || n.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#e0e0e0' }} />
                  <div className="nr-card-body">
                    <h3 className="nr-card-title">{n.title}</h3>
                    <p className="nr-card-date">{n.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {activeTab === 'contacts' && (
          <>
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
                  <button type="button" className="cm-small-btn cm-small-btn--outline" onClick={() => { setEditingId(null); setEcForm({ category: '', station: '', hotline: '', location: '' }); setEcModalOpen(true) }}>+ Add Contact</button>
                </div>
              </div>
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
          </>
        )}
      </div>
    </div>
    {showNewsModal && (
      <CMModal open={showNewsModal} title={'News Room CMS'} onClose={() => setShowNewsModal(false)}>
        <div className="nr-form">
              <div className="nr-field">
                <label>Headline Photo <span className="nr-help">Main image for the article</span></label>
                <div className="nr-dropzone nr-dropzone--xl" onClick={() => document.getElementById('headline-upload').click()} style={newsForm.headlineImage ? { backgroundImage: `url(${newsForm.headlineImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!newsForm.headlineImage && <span className="nr-drop-icon" />}
                  {newsForm.headlineImage && (
                    <button type="button" className="nr-drop-remove" aria-label="remove" onClick={(e) => { e.stopPropagation(); removeHeadlineImage(); }} />
                  )}
                </div>
                <input 
                  id="headline-upload" 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleHeadlineImageUpload}
                />
              </div>
              <div className="nr-field">
                <label>Headline or Title</label>
                <input 
                  className="nr-input" 
                  placeholder="Value" 
                  value={newsForm.title}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="nr-field">
                <label>Description</label>
                <textarea 
                  className="nr-input" 
                  rows="3" 
                  placeholder="Value"
                  value={newsForm.description}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="nr-field">
                <label>Author</label>
                <input 
                  className="nr-input nr-input--sm" 
                  placeholder="Value"
                  value={newsForm.author}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, author: e.target.value }))}
                />
              </div>
              <div className="nr-field">
                <label>Additional Photos <span className="nr-help">optional extra images for more content</span></label>
                <div className="nr-dropzone nr-dropzone--sm" onClick={() => document.getElementById('additional-upload').click()}>
                  <span className="nr-drop-icon" />
                </div>
                <input 
                  id="additional-upload" 
                  type="file" 
                  accept="image/*" 
                  multiple
                  style={{ display: 'none' }} 
                  onChange={handleAdditionalImagesUpload}
                />
                {newsForm.additionalImages.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {newsForm.additionalImages.map((img, idx) => (
                      <div key={idx} style={{ width: '80px', height: '80px', backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '4px' }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="nr-actions">
                <button type="button" className="nr-post" onClick={saveNewsItem}>Post News</button>
              </div>
        </div>
      </CMModal>
    )}
    {safetyModalOpen && (
      <CMModal open={safetyModalOpen} title={`${safetyForm.section==='kitchen' ? 'Kitchen' : 'Electrical'} Fire Safety Tip`} onClose={cancelTip}>
        <div className="nr-form">
              <div className="nr-field">
                <label>Section</label>
                <select className="nr-input" value={safetyForm.section} onChange={(e)=>setSafetyForm({...safetyForm, section: e.target.value})}>
                  <option value="electrical">Electrical Fire Safety Tips</option>
                  <option value="kitchen">Kitchen Fire Safety Tips</option>
                </select>
              </div>
              <div className="nr-field">
                <label>Task Name</label>
                <input className="nr-input" placeholder="Task name" value={safetyForm.task} onChange={(e)=>setSafetyForm({...safetyForm, task:e.target.value})} />
              </div>
              <div className="nr-field">
                <label>Description</label>
                <textarea className="nr-input" rows="3" placeholder="Description" value={safetyForm.desc} onChange={(e)=>setSafetyForm({...safetyForm, desc:e.target.value})} />
              </div>
              <div className="nr-actions">
                <button type="button" className="cm-btn cm-btn--dark" onClick={saveTip}>{safetyForm.id? 'Update' : 'Save'}</button>
              </div>
        </div>
      </CMModal>
    )}
        {ecModalOpen && (
          <CMModal open={ecModalOpen} title={editingId ? 'Edit Contact' : 'Add Contact'} onClose={resetEcForm}>
            <div className="nr-form">
                  <div className="nr-field">
                    <label>Category</label>
                    <input className="nr-input" name="category" value={ecForm.category} onChange={onEcChange} placeholder="Value" />
                  </div>
                  <div className="nr-field">
                    <label>Station</label>
                    <input className="nr-input" name="station" value={ecForm.station} onChange={onEcChange} placeholder="Value" />
                  </div>
                  <div className="nr-field">
                    <label>Hot-line Number</label>
                    <input className="nr-input" name="hotline" value={ecForm.hotline} onChange={onEcChange} placeholder="Value" />
                  </div>
                  <div className="nr-field">
                    <label>Location</label>
                    <input className="nr-input" name="location" value={ecForm.location} onChange={onEcChange} placeholder="Value" />
                  </div>
                  <div className="nr-actions">
                    <button type="button" className="cm-btn cm-btn--dark" onClick={(e) => { saveContact(e); setEcModalOpen(false) }}>{editingId ? 'Update' : 'Save'}</button>
                  </div>
            </div>
          </CMModal>
        )}
    </>
  )
}

export default ContentManagement
  function CMModal({ open, title, children, onClose }) {
    if (!open) return null
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header" style={{ position: 'relative' }}>
            <h3 style={{ margin: 0, width: '100%', textAlign: 'center' }}>{title}</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    )
  }
