import React, { useState, useEffect, useContext } from 'react'
import '../style/contentmanagement.css'
import '../style/newsroom.css'
import '../style/safetytips.css'
import '../style/emergencycontacts.css'
import '../style/modals.css'
import '../style/NRmodals.css'
import { AuthContext } from '../context/AuthContext'
import apiClient from '../utils/apiClient'

function ContentManagement() {

  const { user } = useContext(AuthContext)

  const [activeTab, setActiveTab] = useState('news')
  const [showNewsModal, setShowNewsModal] = useState(false)
  const [openSections, setOpenSections] = useState({})
  const [safetyTips, setSafetyTips] = useState([])
  const [safetyCategories, setSafetyCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  
  // Computed values for selected category
  const selectedCategory = safetyCategories.find(c => c.id === selectedCategoryId)
  const selectedTips = selectedCategory && Array.isArray(safetyTips)
    ? safetyTips.filter((t) => t.category_id === selectedCategoryId)
    : []

  // Side panel functions
  const openSidePanel = (category) => {
    setSelectedCategoryId(category.id)
    setSidePanelOpen(true)
  }

  const closeSidePanel = () => {
    setSidePanelOpen(false)
    setSelectedCategoryId(null)
  }

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleheading_imageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setNewsForm((prev) => ({ ...prev, heading_image: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const removeheading_image = () => {
    setNewsForm((prev) => ({ ...prev, heading_image: null }))
  }

  const handleAdditionalImagesUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(file)
          })
      )
    ).then((images) => {
      setNewsForm((prev) => ({
        ...prev,
        additionalImages: [...(prev.additionalImages || []), ...images]
      }))
    })
  }

  const handleCategoryImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setCategoryForm((prev) => ({ ...prev, image: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const fetchSafetyTips = async () => {
    try {
      const json = await apiClient.get('/safety-tips')
      setSafetyTips(Array.isArray(json?.data) ? json.data : [])
    } catch (err) {
      showNotification('error', 'Failed to fetch safety tips.')
    }
  }

  const fetchSafetyCategories = async () => {
    try {
      const json = await apiClient.get('/safety-tip-categories')
      setSafetyCategories(Array.isArray(json?.data) ? json.data : [])
    } catch (err) {
      showNotification('error', 'Failed to fetch categories.')
    }
  }

  const getFilteredNewsItems = () => {
    if (!Array.isArray(newsItems)) return []
    if (newsFilter === 'published') return newsItems.filter((n) => n.published)
    if (newsFilter === 'drafts') return newsItems.filter((n) => !n.published)
    return newsItems
  }

  // Save news item with image upload to Supabase
  const saveNewsItem = async (mode) => {
    if (!newsForm.title.trim()) {
      showNotification('error', 'Please enter a title')
      return
    }
    const isPublish = mode === 'publish'
    showConfirmModal(
      'save',
      isPublish ? (editingNewsId ? 'Publish Updates' : 'Publish News Article') : (editingNewsId ? 'Save Draft Updates' : 'Save Draft'),
      isPublish
        ? 'Are you sure you want to publish this news article? It will be visible to all users.'
        : 'Save this news as a draft? It will not be visible to users until published.',
      async () => {
        setIsLoading(true)
        try {
          const payload = {
            title: newsForm.title,
            description: newsForm.description,
            heading_image: newsForm.heading_image || null,
            additional_images: newsForm.additionalImages || [],
            published: isPublish,
            author: newsForm.author || ''
          }

          if (editingNewsId) {
            await apiClient.put(`/news/${editingNewsId}`, payload)
          } else {
            await apiClient.post('/news', payload)
          }

            showNotification(
              'success',
              isPublish
                ? (editingNewsId ? 'News updated and published successfully' : 'News article published successfully')
                : (editingNewsId ? 'Draft updated successfully' : 'Draft saved successfully')
            )
            setShowNewsModal(false)
            resetNewsForm()
            fetchNews()
        } catch (err) {
          showNotification('error', 'Failed to save news.')
        }
        setIsLoading(false)
      }
    )
  }

// ...existing code...
  
  const [safetySearch, setSafetySearch] = useState('')
  const [safetyForm, setSafetyForm] = useState({ open: true, section: 'electrical', categoryId: null, id: null, task: '', desc: '', image: null })
  const [safetyModalOpen, setSafetyModalOpen] = useState(false)

  const filterTips = (tips) => {
    if (!safetySearch.trim()) return tips
    return tips.filter(tip => 
      tip.task.toLowerCase().includes(safetySearch.toLowerCase()) ||
      (tip.description || '').toLowerCase().includes(safetySearch.toLowerCase())
    )
  }

  // News Items state
  const [newsItems, setNewsItems] = useState([]);
  const [newsFilter, setNewsFilter] = useState('all')
  const [editingNewsId, setEditingNewsId] = useState(null)
  // News form state
  const [newsForm, setNewsForm] = useState({
    heading_image: null,
    title: '',
    description: '',
    author: '',
    additionalImages: []
  });

  const resetNewsForm = () => {
    setEditingNewsId(null)
    setNewsForm({
      heading_image: null,
      title: '',
      description: '',
      author: '',
      additionalImages: []
    })
  }

  const openAddNews = () => {
    resetNewsForm()
    setShowNewsModal(true)
  }

  const openEditNews = (newsItem) => {
    setEditingNewsId(newsItem?.id ?? null)
    setNewsForm({
      heading_image: newsItem?.heading_image || null,
      title: newsItem?.title || '',
      description: newsItem?.description || '',
      author: Array.isArray(newsItem?.author) ? newsItem.author.join(', ') : (newsItem?.author || ''),
      additionalImages: Array.isArray(newsItem?.additional_images) ? newsItem.additional_images : []
    })
    setShowNewsModal(true)
  }

  // Fetch news from Supabase
  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const json = await apiClient.get('/news')
      setNewsItems(Array.isArray(json?.data) ? json.data : [])
    } catch (err) {
      showNotification('error', 'Failed to fetch news.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    fetchSafetyTips()
  }, [])

  useEffect(() => {
    fetchSafetyCategories()
  }, [])

  // ...existing code...

  // Persist safety tips to memory (removed localStorage as per guidelines)
  useEffect(() => {
    // Safety tips are now persisted in state only
  }, [])

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', title: '', message: '', onConfirm: null, onCancel: null })
  
  // Emergency contact code modal state
  const [ecCodeModal, setEcCodeModal] = useState({ open: false, action: '', contactId: null, password: '' })
  
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
      onCancel: () => setConfirmModal((prev) => ({ ...prev, open: false }))
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
    setEcCodeModal({ open: true, action, contactId, password: '' })
  }

  const closeEcCodeModal = () => {
    setEcCodeModal({ open: false, action: '', contactId: null, password: '' })
  }

  const handleEcCodeSubmit = (e) => {
    e.preventDefault();
    if (!ecCodeModal.password) {
      showNotification('error', 'Please enter your password');
      return;
    }
    setIsLoading(true);
    apiClient.post('/verify-password', { password: ecCodeModal.password })
      .then(() => {
        if (ecCodeModal.action === 'edit') {
          const contact = contacts.find(c => c.id === ecCodeModal.contactId);
          setEcModalOpen(true);
        } else if (ecCodeModal.action === 'delete') {
          performDeleteContact(ecCodeModal.contactId);
        }
        closeEcCodeModal();
      })
      .catch(() => {
        showNotification('error', 'Incorrect password');
      })
      .finally(() => setIsLoading(false));
  }

  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#f8d7da', image: null, editingKey: null })

  // Category management
  const openCategoryModal = () => {
    setCategoryForm({ name: '', color: '#f8d7da', image: null, editingKey: null })
    setCategoryModalOpen(true)
  }

  const openEditCategoryModal = (category) => {
    if (!category) {
      showNotification('error', 'Category not found')
      return
    }
    setCategoryForm({ 
      name: category.name || '', 
      color: category.color || '#f8d7da', 
      image: category.image_url || null,
      editingKey: category.id 
    })
    setCategoryModalOpen(true)
  }
  
  const closeCategoryModal = () => {
    setCategoryForm({ name: '', color: '#f8d7da', image: null, editingKey: null })
    setCategoryModalOpen(false)
  }
  
  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      showNotification('error', 'Please enter a category name');
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        color: categoryForm.color,
        image_url: categoryForm.image || null,
      }

      if (categoryForm.editingKey) {
        // Update existing category
        await apiClient.put(`/safety-tip-categories/${categoryForm.editingKey}`, payload)
        showNotification('success', 'Category updated successfully')
      } else {
        // Create new category
        await apiClient.post('/safety-tip-categories', payload)
        showNotification('success', 'Category added successfully')
      }
      
      closeCategoryModal()
      fetchSafetyCategories()
    } catch (err) {
      showNotification('error', `Failed to ${categoryForm.editingKey ? 'update' : 'add'} category.`);
    }
    setIsLoading(false);
  }
  
  const deleteCategory = (categoryId) => {
    showConfirmModal(
      'delete',
      'Delete Category',
      `Are you sure you want to delete this category? All safety tips in this category will also be deleted.`,
      async () => {
        setIsLoading(true)
        try {
          await apiClient.delete(`/safety-tip-categories/${categoryId}`)
          showNotification('success', 'Category deleted successfully')
          fetchSafetyCategories()
        } catch (err) {
          showNotification('error', 'Failed to delete category.')
        }
        setIsLoading(false)
      }
    )
  }

  // Emergency Contacts state and handlers
  const [contacts, setContacts] = useState([])

  const fetchContacts = async () => {
    setIsLoading(true)
    try {
      const json = await apiClient.get('/contacts')
      setContacts(Array.isArray(json?.data) ? json.data : [])
    } catch (err) {
      showNotification('error', 'Failed to fetch contacts.')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const [ecForm, setEcForm] = useState({ category: '', station: '', hotline: '', location: '' })
  const [ecSearch, setEcSearch] = useState('')
  
  // Filter contacts based on search
  const filteredContacts = contacts.filter((c) => {
    const q = ecSearch.toLowerCase()
    return [c.category, c.station, c.hotline, c.location].some((v) => v.toLowerCase().includes(q))
  })
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
      async () => {
        setIsLoading(true)
        try {
          const payload = {
            category: ecForm.category,
            station: ecForm.station,
            hotline: ecForm.hotline,
            location: ecForm.location,
            published: true,
          }
          if (editingId) {
            await apiClient.put(`/contacts/${editingId}`, payload)
            showNotification('success', 'Contact updated successfully')
          } else {
            await apiClient.post('/contacts', payload)
            showNotification('success', 'Contact added successfully')
          }
          resetEcForm()
          fetchContacts()
        } catch (err) {
          showNotification('error', 'Failed to save contact.')
        }
        setIsLoading(false)
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
      `Are you sure you want to delete the contact for "${contact?.station}"? This action cannot be undone.`,
      async () => {
        setIsLoading(true)
        try {
          await apiClient.delete(`/contacts/${id}`)
          showNotification('success', 'Contact deleted successfully')
          fetchContacts()
        } catch (err) {
          showNotification('error', 'Failed to delete contact.')
        }
        setIsLoading(false)
      }
    )
  }

  
  // Open add tip modal for specific section
  const openAddTip = (category) => {
    setSafetyForm({ open: true, section: category?.name || 'general', categoryId: category?.id ?? null, id: null, task: '', desc: '', image: null })
    setSafetyModalOpen(true)
  }
  
  const openEditTip = (tip) => {
    setSafetyForm({ open: true, section: tip.section, categoryId: tip.category_id ?? null, id: tip.id, task: tip.task, desc: tip.description, image: tip.image_url || null })
    setSafetyModalOpen(true)
  }
  
  const cancelTip = () => {
    setSafetyForm({ open: false, section: 'electrical', categoryId: null, id: null, task: '', desc: '', image: null })
    setSafetyModalOpen(false)
  }
  
  const deleteTip = (id) => {
    const tip = Array.isArray(safetyTips) ? safetyTips.find((t) => t.id === id) : null
    showConfirmModal(
      'delete',
      'Delete Safety Tip',
      `Are you sure you want to delete the safety tip "${tip?.task || ''}"? This action cannot be undone.`,
      async () => {
        setIsLoading(true)
        try {
          await apiClient.delete(`/safety-tips/${id}`)
          showNotification('success', 'Safety tip deleted successfully')
          fetchSafetyTips()
        } catch (err) {
          showNotification('error', 'Failed to delete safety tip.')
        }
        setIsLoading(false)
      }
    )
  }

  // Save a safety tip to Supabase
  const saveTip = async (e) => {
    if (e) e.preventDefault();
    const { section, categoryId, id, task, desc, image } = safetyForm;
    if (!task.trim() || !desc.trim()) {
      showNotification('error', 'Please fill in all fields');
      return;
    }
    showConfirmModal(
      'save',
      id ? 'Update Safety Tip' : 'Add New Safety Tip',
      `Are you sure you want to ${id ? 'update' : 'add'} this safety tip?`,
      async () => {
        setIsLoading(true);
        try {
          const payload = {
            section,
            category_id: categoryId,
            task,
            description: desc,
            image_url: image || null,
          }

          if (id) {
            await apiClient.put(`/safety-tips/${id}`, payload)
          } else {
            await apiClient.post('/safety-tips', payload)
          }

          showNotification('success', id ? 'Safety tip updated successfully' : 'Safety tip added successfully')
          cancelTip()
          fetchSafetyTips()
        } catch (err) {
          showNotification('error', 'Failed to save safety tip.');
        }
        setIsLoading(false);
      }
    );
  }
  return (  
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
              <h2>Safety Tips</h2>
              <p className="cm-description">Manage safety tips and categories for fire prevention and emergency preparedness guidelines</p>
            </div>
            <div className="st-header">
              <div className="st-search">
                <span className="st-search-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                </span>
                <input className="st-search-input" placeholder="Search safety tips..." value={safetySearch} onChange={(e)=>setSafetySearch(e.target.value)} />
              </div>
              <button className="st-add-category-btn" onClick={openCategoryModal}>+ Add Category</button>
            </div>
            
            {/* SEPARATOR BETWEEN SEARCH AND CONTENT */}
            <div className="search-content-separator">
              <div className="separator-line"></div>
            </div>
            
            <div className="st-categories-grid">
              {safetyCategories.map((category) => {
                const tips = Array.isArray(safetyTips)
                  ? safetyTips.filter((t) => t.category_id === category.id)
                  : []
                return (
                  <div key={category.id} className="st-category-card" onClick={() => openSidePanel(category)}>
                    <div className="st-category-image" style={{ 
                      backgroundImage: category.image_url ? `url(${category.image_url})` : 'none',
                      backgroundColor: category.color || '#6c757d'
                    }}>
                      <div className="st-category-actions">
                        <button 
                          className="st-category-btn edit" 
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditCategoryModal(category)
                          }}
                          title="Edit Category"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button 
                          className="st-category-btn delete" 
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteCategory(category.id)
                          }}
                          title="Delete Category"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="st-category-content">
                      <h3 className="st-category-title">{category.name}</h3>
                      <p className="st-category-count">{tips.length} safety tips</p>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {safetyCategories.length === 0 && (
              <div className="st-empty-state">
                <h3>No categories yet</h3>
                <p>Create your first safety tips category to get started</p>
              </div>
            )}
            
            {/* Side Panel */}
            {sidePanelOpen && (
              <>
                <div className="st-side-panel-overlay open" onClick={closeSidePanel}></div>
                <div className="st-side-panel open">
                  <div className="st-side-panel-header">
                    <h2 className="st-side-panel-title">{selectedCategory?.name}</h2>
                    <button className="st-side-panel-close" onClick={closeSidePanel}>×</button>
                  </div>
                  <div className="st-side-panel-body">
                    <div className="st-tips-grid">
                      {filterTips(selectedTips).map((tip) => (
                        <div key={tip.id} className="st-tip-card">
                          <div className="st-tip-card-header">
                            <h3 className="st-tip-task">{tip.task}</h3>
                            <div className="st-tip-actions">
                              <button 
                                className="st-tip-action-btn edit"
                                onClick={() => openEditTip(tip)}
                                title="Edit Tip"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button 
                                className="st-tip-action-btn delete"
                                onClick={() => deleteTip(tip.id)}
                                title="Delete Tip"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3,6 5,6 21,6"/>
                                  <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="st-tip-description">{tip.description}</p>
                        </div>
                      ))}
                      {selectedTips.length === 0 && (
                        <div className="st-empty-state">
                          <h3>No safety tips yet</h3>
                          <p>Add your first safety tip to this category</p>
                        </div>
                      )}
                    </div>
                    <button className="st-add-tip-btn" onClick={() => openAddTip(selectedCategory)}>
                      + Add Safety Tip
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
        {activeTab === 'news' && (
          <>
          {/*News room*/}
            <div className="nr-list-head">
              <div className="cm-card-head">
              <h2>News Room</h2>
              <p className="cm-description">For posting general articles, announcements, and updates from BFP</p>
            </div>
            </div>
            <div className="nr-list-toolbar">
              <div className="cm-search">
                <span className="cm-search-icon" />
                <input className="cm-search-input" placeholder="Search" />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`cm-small-btn cm-small-btn--outline ${newsFilter === 'all' ? 'cm-tab-active' : ''}`}
                  onClick={() => setNewsFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`cm-small-btn cm-small-btn--outline ${newsFilter === 'published' ? 'cm-tab-active' : ''}`}
                  onClick={() => setNewsFilter('published')}
                >
                  Published
                </button>
                <button
                  type="button"
                  className={`cm-small-btn cm-small-btn--outline ${newsFilter === 'drafts' ? 'cm-tab-active' : ''}`}
                  onClick={() => setNewsFilter('drafts')}
                >
                  Drafts
                </button>
              </div>
              <button className="cm-small-btn cm-small-btn--outline" onClick={openAddNews}>+ Add news</button>
            </div>
            
            {/* SEPARATOR BETWEEN SEARCH AND CONTENT */}
            <div className="search-content-separator">
              <div className="separator-line"></div>
            </div>
            
            <div className="nr-grid">
              {getFilteredNewsItems().map((n) => (
                <div key={n.id} className="nr-card" onClick={() => showNewsContent(n)}>
                  <button className="nr-card-edit" title="Edit" onClick={(e) => { e.stopPropagation(); openEditNews(n); }} />
                  <div className="nr-card-media" style={n.heading_image ? { backgroundImage: `url(${n.heading_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#e0e0e0' }} />
                  <div style={{ marginTop: '6px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        background: n.published ? '#e6ffed' : '#fff4e5',
                        color: n.published ? '#0f5132' : '#7a4b00'
                      }}
                    >
                      {n.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="nr-card-author" style={{ fontSize: '0.9em', color: '#888', marginTop: '4px' }}>
                    {n.author ? `By ${Array.isArray(n.author) ? n.author.join(', ') : n.author}` : ''}
                  </div>
                  {Array.isArray(n.additional_images) && n.additional_images.length > 0 && (
                    <div className="nr-card-additional-images" style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      {n.additional_images.map((img, idx) => (
                        <img key={idx} src={img} alt={`Additional ${idx + 1}`} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #eee' }} />
                      ))}
                    </div>
                  )}
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
              <h2>Emergency Contacts</h2>
              <p className="cm-description">Manage emergency contact information including hotlines, stations, and response teams</p>
            </div>
            <div className="ec-header">
              <div className="ec-search">
                <span className="ec-search-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                </span>
                <input className="ec-search-input" placeholder="Search contacts..." value={ecSearch} onChange={(e)=>setEcSearch(e.target.value)} />
              </div>
              <button className="ec-add-contact-btn" onClick={() => { setEditingId(null); setEcForm({ category: '', station: '', hotline: '', location: '' }); setEcModalOpen(true) }}>+ Add Contact</button>
            </div>
            
            {/* SEPARATOR BETWEEN SEARCH AND CONTENT */}
            <div className="search-content-separator">
              <div className="separator-line"></div>
            </div>
            
            <div className="ec-grid">
              {filteredContacts.map((c) => (
                <div key={c.id} className="ec-card">
                  <div className="ec-card-header">
                    <div className="ec-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.89 19.38 19.38 0 0 0 6.41 6.41 19.38 19.38 0 0 0 6.41 6.41A2 2 0 0 1 22 16.92z"/>
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12"/>
                        <line x1="10" y1="6" x2="18" y2="6"/>
                        <line x1="10" y1="10" x2="18" y2="10"/>
                      </svg>
                    </div>
                    <div className="ec-card-title">
                      <div className="ec-card-category">{c.category}</div>
                      <div className="ec-card-station">{c.station}</div>
                    </div>
                  </div>
                  
                  <div className="ec-card-body">
                    <div className="ec-info-row">
                      <span className="ec-info-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.89 19.38 19.38 0 0 0 6.41 6.41 19.38 19.38 0 0 0 6.41 6.41A2 2 0 0 1 22 16.92z"/>
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12"/>
                          <line x1="10" y1="6" x2="18" y2="6"/>
                          <line x1="10" y1="10" x2="18" y2="10"/>
                        </svg>
                      </span>
                      <span className="ec-info-text">{c.hotline}</span>
                    </div>
                    <div className="ec-info-row">
                      <span className="ec-info-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <path d="M3.05 11a9 9 0 0 0 9 7.94"/>
                        </svg>
                      </span>
                      <span className="ec-info-text">{c.location}</span>
                    </div>
                  </div>
                  
                  <div className="ec-card-actions">
                    <button className="ec-action-btn edit" onClick={() => editContact(c)} title="Edit Contact">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="ec-action-btn delete" onClick={() => deleteContact(c.id)} title="Delete Contact">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {contacts.length === 0 && (
              <div className="ec-empty-state">
                <h3>No emergency contacts yet</h3>
                <p>Add your first emergency contact to get started</p>
              </div>
            )}
          </>
        )}

        {confirmModal.open && (
          <div className="confirm-modal-backdrop">
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-modal-icon">
                <span className={`confirm-icon confirm-icon--${confirmModal.type}`}>
                  <i className={`fa-solid ${confirmModal.type === 'delete' ? 'fa-trash' : 'fa-check'}`}></i>
                </span>
              </div>
              <h3 className="confirm-modal-title">{confirmModal.title}</h3>
              <p className="confirm-modal-message">{confirmModal.message}</p>
              <div className="confirm-modal-actions">
                <button
                  type="button"
                  className="confirm-btn confirm-btn--cancel"
                  onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`confirm-btn confirm-btn--${confirmModal.type === 'delete' ? 'delete' : 'save'}`}
                  onClick={async () => {
                    const onConfirm = confirmModal.onConfirm
                    setConfirmModal((prev) => ({ ...prev, open: false }))
                    if (typeof onConfirm === 'function') await onConfirm()
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? <span className="loading-spinner"></span> : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

    {/* Emergency Contact Code Modal */}
    {ecCodeModal.open && (
      <div className="confirm-modal-backdrop">
        <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-modal-icon">
            <span className="confirm-icon confirm-icon--save"><i className="fa-solid fa-lock"></i></span>
          </div>
          <h3 className="confirm-modal-title">
            {ecCodeModal.action === 'edit' ? 'Edit Contact' : 'Delete Contact'} - Password Required
          </h3>
          <p className="confirm-modal-message">
            Please enter your password to {ecCodeModal.action === 'edit' ? 'edit' : 'delete'} this emergency contact.
          </p>
          <form onSubmit={handleEcCodeSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                placeholder="Enter your password"
                value={ecCodeModal.password}
                onChange={(e) => setEcCodeModal({ ...ecCodeModal, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #dc143c',
                  borderRadius: '8px',
                  fontSize: '16px',
                  textAlign: 'center',
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
      <CMModal
        open={showNewsModal}
        title={editingNewsId ? 'Edit News' : 'News Room CMS'}
        onClose={() => {
          setShowNewsModal(false)
          resetNewsForm()
        }}
      >
        <div className="nr-form">
              <div className="nr-field">
                <label>Headline Photo <span className="nr-help">Main image for the article</span></label>
                <input 
                  id="headline-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleheading_imageUpload}
                />
                {newsForm.heading_image && (
                  <div className="image-preview">
                    <img src={newsForm.heading_image} alt="Headline preview" />
                    <button type="button" className="remove-image-btn" onClick={(e) => { e.stopPropagation(); removeheading_image(); }}>
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                )}
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
                <input 
                  id="additional-upload" 
                  type="file" 
                  accept="image/*" 
                  multiple
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
                <button type="button" className="cm-small-btn cm-small-btn--outline" onClick={() => saveNewsItem('draft')} disabled={isLoading}>
                  {isLoading ? <span className="loading-spinner"></span> : 'Save Draft'}
                </button>
                <button type="button" className="nr-post" onClick={() => saveNewsItem('publish')} disabled={isLoading}>
                  {isLoading ? <span className="loading-spinner"></span> : 'Publish'}
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
                      newsContentModal.newsItem.heading_image
                        ? { backgroundImage: `url(${newsContentModal.newsItem.heading_image})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '300px' }
                        : { backgroundColor: '#e0e0e0', height: '300px' }
                    } />
                  
                    {Array.isArray(newsContentModal.newsItem.additional_images) && newsContentModal.newsItem.additional_images.length > 0 && (
                      <div className="news-content-additional-images" style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
                        {newsContentModal.newsItem.additional_images.map((img, idx) => (
                          <img key={idx} src={img} alt={`Additional ${idx + 1}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee' }} />
                        ))}
                      </div>
                    )}
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
                      <div className="article-content">
                        <p>{newsContentModal.newsItem.description}</p>
                        
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
                    </div>
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
                    onChange={handleCategoryImageUpload}
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
      </div>
    </div>
  );
}

function CMModal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header" style={{ position: 'relative' }}>
          <h3 style={{ margin: 0, width: '100%', textAlign: 'center' }}>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default ContentManagement

