import React, { useState, useEffect } from 'react'
import '../style/content.css'
import '../style/newsroom.css'
import '../style/modals.css'

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
    electrical: {
      tips: [
        { id: 1, task: 'Avoid Overloading Outlets', desc: 'Never plug too many devices into one outlet or……' },
        { id: 2, task: 'Check Wires and Cords Regularly', desc: 'Inspect electrical cords for fraying, cracks, or ………' },
        { id: 3, task: 'If sparks occur', desc: 'Unplug the device if safe, turn off the breaker………' },
      ],
      color: '#f8d7da',
      image: null
    },
    kitchen: {
      tips: [
        { id: 1, task: 'Keep a Lid Nearby', desc: 'Smother small grease fires by sliding a lid over the pan.' },
        { id: 2, task: 'Stay in the Kitchen', desc: 'Never leave cooking unattended, especially when frying.' },
        { id: 3, task: 'Turn Pot Handles Inward', desc: 'Prevent spills and burns by keeping handles out of reach.' },
        { id: 4, task: 'Keep Flammables Away', desc: 'Keep towels, paper, and packaging at least 3 feet from the stove.' },
        { id: 5, task: 'Have a Fire Extinguisher Nearby', desc: 'Store a Class K or ABC extinguisher in the kitchen and know how to use it.' },
      ],
      color: '#e8f5e2',
      image: null
    },
  })
  
  const [safetySearch, setSafetySearch] = useState('')
  const [safetyForm, setSafetyForm] = useState({ open: false, section: 'electrical', id: null, task: '', desc: '', image: null })
  const [safetyModalOpen, setSafetyModalOpen] = useState(false)

  const filterTips = (tips) => {
    if (!safetySearch.trim()) return tips
    return tips.filter(tip => 
      tip.task.toLowerCase().includes(safetySearch.toLowerCase()) ||
      tip.desc.toLowerCase().includes(safetySearch.toLowerCase())
    )
  }

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
      showNotification('error', 'Please enter a title')
      return
    }
    
    showConfirmModal(
      'save',
      'Publish News Article',
      'Are you sure you want to publish this news article? It will be visible to all users.',
      () => {
        setIsLoading(true)
        setTimeout(() => {
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
          showNotification('success', 'News article published successfully')
          setIsLoading(false)
        }, 500)
      }
    )
  }

  // Persist safety tips to memory (removed localStorage as per guidelines)
  useEffect(() => {
    // Safety tips are now persisted in state only
  }, [])

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', title: '', message: '', onConfirm: null, onCancel: null })
  
  // Emergency contact code modal state
  const [ecCodeModal, setEcCodeModal] = useState({ open: false, action: '', contactId: null, code: '' })
  
  // News content view modal state
  const [newsContentModal, setNewsContentModal] = useState({ open: false, newsItem: null })
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, type: '', message: '' })

  // Show confirmation modal
  const showConfirmModal = (type, title, message, onConfirm) => {
    setConfirmModal({
      open: true,
      type,
      title,
      message,
      onConfirm,
      onCancel: () => setConfirmModal({ ...confirmModal, open: false })
    })
  }

  // Show notification
  const showNotification = (type, message) => {
    setNotification({ open: true, type, message })
    setTimeout(() => setNotification({ open: false, type: '', message: '' }), 3000)
  }

  // News content modal functions
  const showNewsContent = (newsItem) => {
    setNewsContentModal({ open: true, newsItem })
  }

  const closeNewsContentModal = () => {
    setNewsContentModal({ open: false, newsItem: null })
  }

  // Emergency contact code modal functions
  const showEcCodeModal = (action, contactId) => {
    setEcCodeModal({ open: true, action, contactId, code: '' })
  }

  const closeEcCodeModal = () => {
    setEcCodeModal({ open: false, action: '', contactId: null, code: '' })
  }

  const handleEcCodeSubmit = (e) => {
    e.preventDefault()
    // For demo purposes, accept any 4-digit code
    if (ecCodeModal.code.length === 4) {
      if (ecCodeModal.action === 'edit') {
        const contact = contacts.find(c => c.id === ecCodeModal.contactId)
        setEcModalOpen(true) // Open the edit modal after code confirmation
      } else if (ecCodeModal.action === 'delete') {
        performDeleteContact(ecCodeModal.contactId)
      }
      closeEcCodeModal()
    } else {
      showNotification('error', 'Please enter a valid 4-digit code')
    }
  }

  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#f8d7da', image: null, editingKey: null })

  // Category management
  const openCategoryModal = () => {
    setCategoryForm({ name: '', color: '#f8d7da', image: null, editingKey: null })
    setCategoryModalOpen(true)
  }

  const openEditCategoryModal = (categoryKey) => {
    const category = safetyTips[categoryKey]
    setCategoryForm({ 
      name: categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      color: category.color || '#f8d7da', 
      image: category.image || null,
      editingKey: categoryKey 
    })
    setCategoryModalOpen(true)
  }
  
  const closeCategoryModal = () => {
    setCategoryForm({ name: '', color: '#f8d7da', image: null, editingKey: null })
    setCategoryModalOpen(false)
  }
  
  const saveCategory = () => {
    if (!categoryForm.name.trim()) {
      showNotification('error', 'Please enter a category name')
      return
    }
    
    if (categoryForm.editingKey) {
      // Edit existing category
      const newCategoryKey = categoryForm.name.toLowerCase().replace(/\s+/g, '_')
      setSafetyTips(prev => {
        const newState = { ...prev }
        const oldCategory = newState[categoryForm.editingKey]
        
        // If key changed, remove old and add new
        if (newCategoryKey !== categoryForm.editingKey) {
          delete newState[categoryForm.editingKey]
        }
        
        newState[newCategoryKey] = {
          ...oldCategory,
          color: categoryForm.color,
          image: categoryForm.image
        }
        
        return newState
      })
      showNotification('success', 'Category updated successfully')
    } else {
      // Add new category
      const newCategoryKey = categoryForm.name.toLowerCase().replace(/\s+/g, '_')
      setSafetyTips(prev => ({
        ...prev,
        [newCategoryKey]: {
          tips: [],
          color: categoryForm.color,
          image: categoryForm.image
        }
      }))
      showNotification('success', 'Category added successfully')
    }
    
    closeCategoryModal()
  }
  
  const deleteCategory = (categoryKey) => {
    showConfirmModal(
      'delete',
      'Delete Category',
      `Are you sure you want to delete this category? All safety tips in this category will also be deleted.`,
      () => {
        setSafetyTips(prev => {
          const newState = { ...prev }
          delete newState[categoryKey]
          return newState
        })
        showNotification('success', 'Category deleted successfully')
      }
    )
  }

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
    if (!ecForm.category || !ecForm.station || !ecForm.hotline || !ecForm.location) {
      showNotification('error', 'Please fill in all fields')
      return
    }
    
    showConfirmModal(
      'save',
      editingId ? 'Update Contact' : 'Add New Contact',
      `Are you sure you want to ${editingId ? 'update' : 'add'} this emergency contact?`,
      () => {
        setIsLoading(true)
        setTimeout(() => {
          if (editingId) {
            setContacts((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...ecForm } : c)))
            showNotification('success', 'Contact updated successfully')
          } else {
            const nextId = contacts.length ? Math.max(...contacts.map((c) => c.id)) + 1 : 1
            setContacts((prev) => [...prev, { id: nextId, ...ecForm }])
            showNotification('success', 'Contact added successfully')
          }
          resetEcForm()
          setIsLoading(false)
        }, 500)
      }
    )
  }
  
  const editContact = (c) => { 
    // Instead of directly opening modal, show code confirmation
    showEcCodeModal('edit', c.id)
    // Keep the form data ready for when code is confirmed
    setEditingId(c.id); 
    setEcForm({ category: c.category, station: c.station, hotline: c.hotline, location: c.location }); 
  }
  
  const deleteContact = (id) => {
    // Show code modal instead of direct deletion
    showEcCodeModal('delete', id)
  }

  // Function to actually delete contact after code confirmation
  const performDeleteContact = (id) => {
    const contact = contacts.find(c => c.id === id)
    showConfirmModal(
      'delete',
      'Delete Contact',
      `Are you sure you want to delete the contact for "${contact.station}"? This action cannot be undone.`,
      () => {
        setIsLoading(true)
        setTimeout(() => {
          setContacts((prev) => prev.filter((c) => c.id !== id))
          showNotification('success', 'Contact deleted successfully')
          setIsLoading(false)
        }, 500)
      }
    )
  }

  const sortedContacts = [...contacts].sort((a, b) => a.station.localeCompare(b.station))

  // Open add tip modal for specific section
  const openAddTip = (section) => {
    setSafetyForm({ open: true, section, id: null, task: '', desc: '', image: null })
    setSafetyModalOpen(true)
  }
  
  const openEditTip = (section, tip) => {
    setSafetyForm({ open: true, section, id: tip.id, task: tip.task, desc: tip.desc, image: tip.image || null })
    setSafetyModalOpen(true)
  }
  
  const cancelTip = () => {
    setSafetyForm({ open: false, section: 'electrical', id: null, task: '', desc: '', image: null })
    setSafetyModalOpen(false)
  }
  
  const deleteTip = (section, id) => {
    const tip = safetyTips[section].tips.find(t => t.id === id)
    showConfirmModal(
      'delete',
      'Delete Safety Tip',
      `Are you sure you want to delete the safety tip "${tip.task}"? This action cannot be undone.`,
      () => {
        setIsLoading(true)
        setTimeout(() => {
          setSafetyTips((prev) => ({ 
            ...prev, 
            [section]: {
              ...prev[section],
              tips: prev[section].tips.filter((t) => t.id !== id)
            }
          }))
          showNotification('success', 'Safety tip deleted successfully')
          setIsLoading(false)
        }, 500)
      }
    )
  }

  const saveTip = (e) => {
    if (e) e.preventDefault()
    const { section, id, task, desc, image } = safetyForm
    if (!task.trim() || !desc.trim()) {
      showNotification('error', 'Please fill in all fields')
      return
    }
    
    showConfirmModal(
      'save',
      id ? 'Update Safety Tip' : 'Add New Safety Tip',
      `Are you sure you want to ${id ? 'update' : 'add'} this safety tip?`,
      () => {
        setIsLoading(true)
        setTimeout(() => {
          setSafetyTips((prev) => {
            const list = [...prev[section].tips]
            if (id) {
              const idx = list.findIndex((t) => t.id === id)
              if (idx > -1) list[idx] = { ...list[idx], task, desc, image }
              showNotification('success', 'Safety tip updated successfully')
            } else {
              const nextId = list.length ? Math.max(...list.map((t) => t.id)) + 1 : 1
              list.push({ id: nextId, task, desc, image })
              showNotification('success', 'Safety tip added successfully')
            }
            return { 
              ...prev, 
              [section]: {
                ...prev[section],
                tips: list
              }
            }
          })
          cancelTip()
          setIsLoading(false)
        }, 500)
      }
    )
  }

  return (
    <>
    <div className="cm-wrapper">
      <div className="cm-header">
        <h1 className="cm-title" style={{ color: '#000000' }}>Content Management</h1>
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
        </div>
        <div className="cm-search-and-add">
          <div className="cm-search">
            <span className="cm-search-icon" />
            <input className="cm-search-input" placeholder="Search" value={safetySearch} onChange={(e)=>setSafetySearch(e.target.value)} />
          </div>
          <button className="cm-small-btn cm-small-btn--outline" onClick={openCategoryModal}>+ Add Category</button>
        </div>
        <div className="cm-accordion">
          <div className="cm-section">
            <div className="cm-section-bar" style={{ background: `linear-gradient(180deg, ${safetyTips.electrical.color} 0%, ${safetyTips.electrical.color}dd 100%)` }}>
              <button className="cm-section-toggle" onClick={() => toggleSection('electrical')} aria-expanded={openSections.electrical}>
                <span className={openSections.electrical ? 'cm-caret-down' : 'cm-caret-right'} />
              </button>
              <div className="cm-section-title">
                <strong>Electrical Fire Safety Tips</strong>
                <span className="cm-section-meta">{safetyTips.electrical.tips.length} tasks</span>
              </div>
              <div className="cm-section-actions">
                <button className="cm-small-btn cm-small-btn--black" onClick={() => openEditCategoryModal('electrical')}>
                  <i className="fa-solid fa-edit"></i>
                  <span>Edit Category</span>
                </button>
                <div className="cm-button-divider"></div>
                <button className="cm-small-btn cm-small-btn--gray" onClick={() => deleteCategory('electrical')}>Delete Category</button>
                <div className="cm-button-divider"></div>
                <button className="cm-small-btn cm-small-btn--outline" onClick={()=>openAddTip('electrical')}>+ Add Safety tips</button>
              </div>
            </div>
            {openSections.electrical && (
              <div className="cm-table">
                <div className="cm-thead">
                  <div className="cm-th">Task Name</div>
                  <div className="cm-th">Description</div>
                  <div className="cm-th cm-th-actions">Actions</div>
                </div>
                <div className="cm-tbody">
                  {filterTips(safetyTips.electrical.tips).map((row) => (
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
            <div className="cm-section-bar" style={{ background: `linear-gradient(180deg, ${safetyTips.kitchen.color} 0%, ${safetyTips.kitchen.color}dd 100%)` }}>
              <button className="cm-section-toggle" onClick={() => toggleSection('kitchen')} aria-expanded={openSections.kitchen}>
                <span className={openSections.kitchen ? 'cm-caret-down' : 'cm-caret-right'} />
              </button>
              <div className="cm-section-title">
                <strong>Kitchen Fire Safety Tips</strong>
                <span className="cm-section-meta">{safetyTips.kitchen.tips.length} tasks</span>
              </div>
              <div className="cm-section-actions">
                <button className="cm-small-btn cm-small-btn--black" onClick={() => openEditCategoryModal('kitchen')}>
                  <i className="fa-solid fa-edit"></i>
                  <span>Edit Category</span>
                </button>
                <div className="cm-button-divider"></div>
                <button className="cm-small-btn cm-small-btn--gray" onClick={() => deleteCategory('kitchen')}>Delete Category</button>
                <div className="cm-button-divider"></div>
                <button className="cm-small-btn cm-small-btn--outline" onClick={()=>openAddTip('kitchen')}>+ Add Safety tips</button>
              </div>
            </div>
            {openSections.kitchen && (
              <div className="cm-table">
                <div className="cm-thead">
                  <div className="cm-th">Task Name</div>
                  <div className="cm-th">Description</div>
                  <div className="cm-th cm-th-actions">Actions</div>
                </div>
                <div className="cm-tbody">
                  {filterTips(safetyTips.kitchen.tips).map((row) => (
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
                <div key={n.id} className="nr-card" onClick={() => showNewsContent(n)}>
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
            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
              <button className="cm-small-btn cm-small-btn--outline" onClick={() => { setEditingId(null); setEcForm({ category: '', station: '', hotline: '', location: '' }); setEcModalOpen(true) }}>+ Add Contact</button>
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
                {sortedContacts.map((c) => (
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
    
    {/* Confirmation Modal */}
    {confirmModal.open && (
      <div className="confirm-modal-backdrop" onClick={confirmModal.onCancel}>
        <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-modal-icon">
            {confirmModal.type === 'delete' ? (
              <span className="confirm-icon confirm-icon--danger"><i className="fa-solid fa-trash"></i></span>
            ) : (
              <span className="confirm-icon confirm-icon--save"><i className="fa-solid fa-check"></i></span>
            )}
          </div>
          <h3 className="confirm-modal-title">{confirmModal.title}</h3>
          <p className="confirm-modal-message">{confirmModal.message}</p>
          <div className="confirm-modal-actions">
            <button 
              className="confirm-btn confirm-btn--cancel" 
              onClick={confirmModal.onCancel}
              disabled={isLoading}
            >
              <i className="fa-solid fa-xmark"></i>
              <span>Cancel</span>
            </button>
            <button 
              className={`confirm-btn confirm-btn--${confirmModal.type}`} 
              onClick={() => {
                confirmModal.onConfirm()
                setConfirmModal({ ...confirmModal, open: false })
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  {confirmModal.type === 'delete' ? (
                    <>
                      <i className="fa-solid fa-trash"></i>
                      <span>Delete</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i>
                      <span>Confirm</span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Emergency Contact Code Modal */}
    {ecCodeModal.open && (
      <div className="confirm-modal-backdrop" onClick={closeEcCodeModal}>
        <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-modal-icon">
            <span className="confirm-icon confirm-icon--save"><i className="fa-solid fa-lock"></i></span>
          </div>
          <h3 className="confirm-modal-title">
            {ecCodeModal.action === 'edit' ? 'Edit Contact' : 'Delete Contact'} - Code Required
          </h3>
          <p className="confirm-modal-message">
            Please enter a 4-digit code to {ecCodeModal.action === 'edit' ? 'edit' : 'delete'} this emergency contact.
          </p>
          <form onSubmit={handleEcCodeSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                maxLength="4"
                placeholder="Enter 4-digit code"
                value={ecCodeModal.code}
                onChange={(e) => setEcCodeModal({ ...ecCodeModal, code: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #dc143c',
                  borderRadius: '8px',
                  fontSize: '16px',
                  textAlign: 'center',
                  letterSpacing: '4px'
                }}
              />
            </div>
            <div className="confirm-modal-actions">
              <button 
                type="button"
                className="confirm-btn confirm-btn--cancel" 
                onClick={closeEcCodeModal}
                disabled={isLoading}
              >
                <i className="fa-solid fa-xmark"></i>
                <span>Cancel</span>
              </button>
              <button 
                type="submit"
                className="confirm-btn confirm-btn--save" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    <span>Confirm</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Notification */}
    {notification.open && (
      <div className={`notification notification--${notification.type}`}>
        <span className="notification-icon">
          {notification.type === 'success' ? '✓' : '⚠️'}
        </span>
        <span className="notification-message">{notification.message}</span>
      </div>
    )}

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
                <button type="button" className="nr-post" onClick={saveNewsItem} disabled={isLoading}>
                  {isLoading ? <span className="loading-spinner"></span> : 'Post News'}
                </button>
              </div>
        </div>
      </CMModal>
    )}
    {newsContentModal.open && (
      <CMModal open={newsContentModal.open} title="News Article" onClose={closeNewsContentModal}>
        <div className="news-content-view">
          {newsContentModal.newsItem && (
            <>
              <div className="news-content-header">
                <div className="news-content-image" style={
                  (newsContentModal.newsItem.headlineImage || newsContentModal.newsItem.image) 
                    ? { backgroundImage: `url(${newsContentModal.newsItem.headlineImage || newsContentModal.newsItem.image})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '300px' } 
                    : { backgroundColor: '#e0e0e0', height: '300px' }
                } />
                <div className="news-content-meta">
                  <h1 className="news-content-title">{newsContentModal.newsItem.title}</h1>
                  <div className="news-content-info">
                    <span className="news-content-date">{newsContentModal.newsItem.date}</span>
                    <span className="news-content-author">By {newsContentModal.newsItem.author}</span>
                    <span className="news-content-category">BFP News</span>
                  </div>
                </div>
              </div>
              
              <div className="news-content-body">
                <div className="news-article">
                  <div className="article-subtitle">
                    <h2>Breaking: Fire Safety Initiative Reaches New Heights in Zamboanga City</h2>
                  </div>
                  
                  <div className="article-lead">
                    <p><strong>ZAMBOANGA CITY</strong> – The Bureau of Fire Protection (BFP) Zamboanga City District has launched a comprehensive fire safety awareness campaign aimed at reducing fire incidents by 40% in the next six months, officials announced today.</p>
                  </div>
                  
                  <div className="article-content">
                    <p>The initiative, dubbed "Operation Safe Community 2024," comes in response to the recent increase in fire-related incidents during the summer season. BFP City Fire Marshal Supt. Ricardo Reyes emphasized the importance of community participation in achieving this ambitious goal.</p>
                    
                    <blockquote className="article-quote">
                      "Fire safety is not just the responsibility of the BFP; it's a collective effort that requires every citizen's active participation. Together, we can create a fire-safe Zamboanga," Reyes stated during the press conference.
                    </blockquote>
                    
                    <h3>Key Components of the Initiative</h3>
                    <p>The campaign focuses on four main areas:</p>
                    <ul className="article-list">
                      <li><strong>Community Education:</strong> Regular fire safety seminars in barangays and schools</li>
                      <li><strong>Equipment Upgrade:</strong> Distribution of modern fire extinguishers to high-risk areas</li>
                      <li><strong>Emergency Response:</strong> Improved coordination with local emergency services</li>
                      <li><strong>Building Inspection:</strong> Comprehensive safety checks on commercial establishments</li>
                    </ul>
                    
                    <h3>Recent Success Stories</h3>
                    <p>Early results from the program have been encouraging. Last month, a potential kitchen fire was prevented in Barangay Tetuan after residents applied the safety techniques learned from BFP's community outreach program.</p>
                    
                    <p>"I was cooking when I noticed the oil starting to smoke. Instead of panicking, I remembered what the BFP taught us – I turned off the heat and covered the pan with a lid. It could have been much worse," shared Maria Santos, a local resident.</p>
                    
                    <div className="article-stats-box">
                      <h4>Fire Safety Statistics (2024)</h4>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <div className="stat-number">-15%</div>
                          <div className="stat-label">Fire Incidents</div>
                        </div>
                        <div class="stat-item">
                          <div className="stat-number">+25%</div>
                          <div className="stat-label">Community Training</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-number">89</div>
                          <div className="stat-label">Lives Saved</div>
                        </div>
                      </div>
                    </div>
                    
                    <h3>Upcoming Events</h3>
                    <p>The BFP has scheduled several activities for the coming months:</p>
                    <ol className="article-list">
                      <li>March 15: Fire Drill at Zamboanga City Hall</li>
                      <li>March 22: Community Safety Fair at Paseo del Mar</li>
                      <li>April 5: Training for Building Administrators</li>
                      <li>April 19: School Fire Safety Program Launch</li>
                    </ol>
                    
                    <p>Residents are encouraged to participate in these activities and report any fire hazards to the BFP hotline at (062) 991-4213.</p>
                    
                    <div className="article-footer">
                      <p><em>For more information about fire safety programs, visit the BFP Zamboanga City Facebook page or contact your local fire station.</em></p>
                    </div>
                  </div>
                </div>
                
                {/* Additional Images Section */}
                {newsContentModal.newsItem.additionalImages && newsContentModal.newsItem.additionalImages.length > 0 && (
                  <div className="article-gallery">
                    <h3>Additional Photos</h3>
                    <div className="gallery-grid">
                      {newsContentModal.newsItem.additionalImages.map((img, idx) => (
                        <div key={idx} className="gallery-item">
                          <img src={img} alt={`News photo ${idx + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CMModal>
    )}
    {safetyModalOpen && (
      <CMModal open={safetyModalOpen} title={safetyForm.id ? 'Edit Safety Tip' : 'Add Safety Tip'} onClose={cancelTip}>
        <div className="nr-form">
              <div className="nr-field">
                <label>Task Name</label>
                <input className="nr-input" placeholder="Task name" value={safetyForm.task} onChange={(e)=>setSafetyForm({...safetyForm, task:e.target.value})} />
              </div>
              <div className="nr-field">
                <label>Description</label>
                <textarea className="nr-input" rows="3" placeholder="Description" value={safetyForm.desc} onChange={(e)=>setSafetyForm({...safetyForm, desc:e.target.value})} />
              </div>
              <div className="nr-field">
                <label>Task Image</label>
                <div className="image-upload-wrapper">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setSafetyForm({...safetyForm, image: reader.result})
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    style={{ display: 'none' }}
                    id="task-image-upload"
                  />
                  <label htmlFor="task-image-upload" className="image-upload-btn">
                    <i className="fa-solid fa-upload"></i>
                    <span>Choose Image</span>
                  </label>
                  {safetyForm.image && (
                    <div className="image-preview">
                      <img src={safetyForm.image} alt="Task preview" />
                      <button 
                        type="button" 
                        className="remove-image-btn"
                        onClick={() => setSafetyForm({...safetyForm, image: null})}
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="nr-actions">
                <button type="button" className="cm-btn cm-btn--dark" onClick={saveTip} disabled={isLoading}>
                  {isLoading ? <span className="loading-spinner"></span> : (safetyForm.id? 'Update' : 'Save')}
                </button>
              </div>
        </div>
      </CMModal>
    )}
        {categoryModalOpen && (
      <CMModal open={categoryModalOpen} title={categoryForm.editingKey ? 'Edit Category' : 'Add Category'} onClose={closeCategoryModal}>
        <div className="nr-form">
              <div className="nr-field">
                <label>Category Name</label>
                <input className="nr-input" placeholder="Enter category name" value={categoryForm.name} onChange={(e)=>setCategoryForm({...categoryForm, name: e.target.value})} />
              </div>
              <div className="nr-field">
                <label>Category Color</label>
                <div className="color-picker-wrapper">
                  <input 
                    type="color" 
                    className="color-picker" 
                    value={categoryForm.color} 
                    onChange={(e)=>setCategoryForm({...categoryForm, color: e.target.value})} 
                  />
                  <div className="color-preview" style={{ backgroundColor: categoryForm.color }}>
                    <span>{categoryForm.color}</span>
                  </div>
                </div>
              </div>
              <div className="nr-field">
                <label>Category Image</label>
                <div className="image-upload-wrapper">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setCategoryForm({...categoryForm, image: reader.result})
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    style={{ display: 'none' }}
                    id="category-image-upload"
                  />
                  <label htmlFor="category-image-upload" className="image-upload-btn">
                    <i className="fa-solid fa-upload"></i>
                    <span>Choose Image</span>
                  </label>
                  {categoryForm.image && (
                    <div className="image-preview">
                      <img src={categoryForm.image} alt="Category preview" />
                      <button 
                        type="button" 
                        className="remove-image-btn"
                        onClick={() => setCategoryForm({...categoryForm, image: null})}
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="nr-actions">
                <button type="button" className="cm-btn cm-btn--dark" onClick={saveCategory} disabled={isLoading}>
                  {isLoading ? <span className="loading-spinner"></span> : (categoryForm.editingKey ? 'Update Category' : 'Save Category')}
                </button>
              </div>
        </div>
      </CMModal>
    )}
        {ecModalOpen && (
          <CMModal open={ecModalOpen} title={editingId ? 'Edit Contact' : 'Add Contact'} onClose={resetEcForm}>
            <div className="nr-form">
                  <div className="nr-field">
                    <label>Category</label>
                    <input className="nr-input" name="category" value={ecForm.category} onChange={onEcChange} placeholder="Enter category" />
                  </div>
                  <div className="nr-field">
                    <label>Station</label>
                    <select className="nr-input" name="station" value={ecForm.station} onChange={onEcChange}>
                      <option value="">Select station type</option>
                      <option value="Main Station">Main Station</option>
                      <option value="Substation">Substation</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div className="nr-field">
                    <label>Hotline Number</label>
                    <input className="nr-input" name="hotline" value={ecForm.hotline} onChange={onEcChange} placeholder="Enter hotline number" />
                  </div>
                  <div className="nr-field">
                    <label>Location</label>
                    <input className="nr-input" name="location" value={ecForm.location} onChange={onEcChange} placeholder="Enter location" />
                  </div>
                  <div className="nr-actions">
                    <button type="button" className="cm-btn cm-btn--dark" onClick={saveContact} disabled={isLoading}>
                      {isLoading ? <span className="loading-spinner"></span> : (editingId ? 'Update Contact' : 'Add Contact')}
                    </button>
                  </div>
            </div>
          </CMModal>
        )}
    </>
  )
}

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

export default ContentManagement
