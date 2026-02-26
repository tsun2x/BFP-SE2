import React, { useState, useEffect, useContext } from 'react'
import '../style/content.css'
import '../style/newsroom.css'
import '../style/modals.css'
import '../style/NRmodals.css'
import { AuthContext } from '../context/AuthContext'
import supabase from '../utils/supabaseClient'

function ContentManagement() {

  const { user } = useContext(AuthContext)

  const [activeTab, setActiveTab] = useState('news')
  const [showNewsModal, setShowNewsModal] = useState(false)
  const [openSections, setOpenSections] = useState({})
  const [safetyTips, setSafetyTips] = useState([])
  const [safetyCategories, setSafetyCategories] = useState([])

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleHeadlineImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setNewsForm((prev) => ({ ...prev, headlineImage: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const removeHeadlineImage = () => {
    setNewsForm((prev) => ({ ...prev, headlineImage: null }))
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

  const fetchSafetyTips = async () => {
    try {
      const { data, error } = await supabase
        .from('safety_tips')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase fetch safety tips error:', error)
        showNotification('error', 'Failed to fetch safety tips: ' + error.message)
        return
      }

      setSafetyTips(Array.isArray(data) ? data : [])
    } catch (err) {
      showNotification('error', 'Failed to fetch safety tips.')
    }
  }

  const fetchSafetyCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('safety_tip_categories')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase fetch safety categories error:', error)
        showNotification('error', 'Failed to fetch categories: ' + error.message)
        return
      }

      setSafetyCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      showNotification('error', 'Failed to fetch categories.')
    }
  }

  // Improved helper function to upload image to Supabase Storage and get public URL
  const uploadImageAndGetUrl = async (base64Data, fileNamePrefix = 'headline') => {
    const BUCKET = 'news-images' // Change to your actual bucket name if different
    const res = await fetch(base64Data)
    const blob = await res.blob()
    // Use blob.type for extension, fallback to 'jpg' if missing
    let fileExt = 'jpg'
    if (blob.type && blob.type.includes('/')) {
      fileExt = blob.type.split('/')[1]
    }
    const fileName = `${fileNamePrefix}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`
    // Debug log
    console.log('Uploading to bucket:', BUCKET, 'filePath:', filePath, 'blob:', blob)
    const { error } = await supabase.storage.from(BUCKET).upload(filePath, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: blob.type || 'image/jpeg'
    })
    if (error) {
      console.error('Supabase upload error:', error.message, error)
      throw error
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
    return data.publicUrl
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
          let headlineUrl = newsForm.headlineImage
          if (headlineUrl && headlineUrl.startsWith('data:')) {
            headlineUrl = await uploadImageAndGetUrl(newsForm.headlineImage, 'headline')
          }
          let additionalImagesUrls = []
          if (newsForm.additionalImages && newsForm.additionalImages.length > 0) {
            additionalImagesUrls = await Promise.all(
              newsForm.additionalImages.map((img, idx) =>
                img.startsWith('data:') ? uploadImageAndGetUrl(img, `additional_${idx}`) : img
              )
            )
          }
          const today = new Date().toISOString()
          // Always save author as an array (even if single string)
          let authorArr = newsForm.author
          if (typeof authorArr === 'string') {
            authorArr = authorArr.trim() ? [authorArr.trim()] : []
          } else if (!Array.isArray(authorArr)) {
            authorArr = []
          }
          const payload = {
            title: newsForm.title,
            description: newsForm.description,
            user_id: user?.user_id || user?.id,
            headline_image: headlineUrl,
            additional_images: additionalImagesUrls,
            published: isPublish,
            published_at: isPublish ? today : null,
            date: today,
            slug: newsForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            metadata: {},
            updated_at: today,
            author: authorArr
          }

          const { error } = editingNewsId
            ? await supabase.from('news_room').update(payload).eq('id', editingNewsId)
            : await supabase.from('news_room').insert([{ ...payload, created_at: today }])

          if (error) {
            console.error('Supabase save news error:', error)
            showNotification('error', 'Failed to save news: ' + error.message)
          } else {
            showNotification(
              'success',
              isPublish
                ? (editingNewsId ? 'News updated and published successfully' : 'News article published successfully')
                : (editingNewsId ? 'Draft updated successfully' : 'Draft saved successfully')
            )
            setShowNewsModal(false)
            resetNewsForm()
            fetchNews()
          }
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
    headlineImage: null,
    title: '',
    description: '',
    author: '',
    additionalImages: []
  });

  const resetNewsForm = () => {
    setEditingNewsId(null)
    setNewsForm({
      headlineImage: null,
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
      headlineImage: newsItem?.headline_image || null,
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
      const { data, error } = await supabase
        .from('news_room')
        .select('*')
        .order('published_at', { ascending: false });
      if (error) {
        console.error('Supabase fetch error:', error); // Log full error for debugging
        showNotification('error', 'Failed to fetch news: ' + error.message);
      } else if (data) {
        setNewsItems(data);
      }
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
    if (!Array.isArray(safetyTips)) {
      showNotification('error', 'Safety tips data is not available')
      return
    }
    const category = null
    if (!category) {
      showNotification('error', 'Category editing is not available right now')
      return
    }
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
  
  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      showNotification('error', 'Please enter a category name');
      return;
    }
    setIsLoading(true);
    try {
      // Insert new category into Supabase
      const payload = {
        name: categoryForm.name.trim(),
        color: categoryForm.color,
        image_url: categoryForm.image || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('safety_tip_categories').insert([payload]);
      if (error) {
        showNotification('error', 'Failed to add category: ' + error.message);
      } else {
        showNotification('success', 'Category added successfully');
        closeCategoryModal();
        fetchSafetyCategories()
      }
    } catch (err) {
      showNotification('error', 'Failed to add category.');
    }
    setIsLoading(false);
  }
  
  const deleteCategory = (categoryKey) => {
    showConfirmModal(
      'delete',
      'Delete Category',
      `Are you sure you want to delete this category? All safety tips in this category will also be deleted.`,
      () => {
        showNotification('error', 'Category deletion is not available right now')
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
          const { error } = await supabase.from('safety_tips').delete().eq('id', id)
          if (error) {
            showNotification('error', 'Failed to delete safety tip: ' + error.message)
          } else {
            showNotification('success', 'Safety tip deleted successfully')
            fetchSafetyTips()
          }
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
          let imageUrl = image;
          if (imageUrl && imageUrl.startsWith('data:')) {
            imageUrl = await uploadImageAndGetUrl(imageUrl, 'safety_tip');
          }
          const now = new Date().toISOString()

          if (id) {
            // Update existing row
            const payload = {
              section,
              category_id: categoryId,
              task,
              description: desc,
              image_url: imageUrl || null,
              updated_at: now
            }
            const { error } = await supabase.from('safety_tips').update(payload).eq('id', id)
            if (error) {
              showNotification('error', 'Failed to update safety tip: ' + error.message)
            } else {
              showNotification('success', 'Safety tip updated successfully')
              cancelTip()
              fetchSafetyTips()
            }
          } else {
            // Insert into Supabase safety_tips table
            const payload = {
              user_id: user?.user_id || user?.id,
              section,
              category_id: categoryId,
              task,
              description: desc,
              image_url: imageUrl || null,
              created_at: now,
              updated_at: now
            }
            const { error } = await supabase.from('safety_tips').insert([payload])
            if (error) {
              showNotification('error', 'Failed to save safety tip: ' + error.message)
            } else {
              showNotification('success', 'Safety tip added successfully')
              cancelTip()
              fetchSafetyTips()
            }
          }
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
              {safetyCategories.map((category) => {
                const tips = Array.isArray(safetyTips)
                  ? safetyTips.filter((t) => t.category_id === category.id)
                  : []
                const sectionKey = String(category.id)
                return (
                  <div className="cm-section" key={category.id}>
                    <div className="cm-section-bar" style={{ background: category.color || '#f5f5f5' }}>
                      <button className="cm-section-toggle" onClick={() => toggleSection(sectionKey)} aria-expanded={openSections[sectionKey]}>
                      <span className={openSections[sectionKey] ? 'cm-caret-down' : 'cm-caret-right'} />
                    </button>
                    <div className="cm-section-title">
                      <strong>{category.name}</strong>
                      <span className="cm-section-meta">{tips.length} tasks</span>
                    </div>
                    {/* Actions can be added here if needed */}
                    <div className="cm-section-actions">
                      <button className="cm-small-btn cm-small-btn--outline" onClick={() => openAddTip(category)}>+ Add Safety tips</button>
                    </div>
                  </div>
                  {openSections[sectionKey] && (
                    <div className="cm-table">
                      <div className="cm-thead">
                        <div className="cm-th">Task Name</div>
                        <div className="cm-th">Description</div>
                        <div className="cm-th cm-th-actions">Actions</div>
                      </div>
                      <div className="cm-tbody">
                        {filterTips(tips).map((row) => (
                          <div key={`${category.id}-${row.id}`} className="cm-tr">
                            <div className="cm-td">{row.task}</div>
                            <div className="cm-td">{row.description}</div>
                            <div className="cm-td cm-actions">
                              <button className="cm-btn cm-btn--dark" onClick={() => openEditTip(row)}>Edit</button>
                              <button className="cm-btn cm-btn--danger" onClick={() => deleteTip(row.id)}>Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          </>
        )}
        {activeTab === 'news' && (
          <>
          {/*News room*/}
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
            <div className="nr-grid">
              {getFilteredNewsItems().map((n) => (
                <div key={n.id} className="nr-card" onClick={() => showNewsContent(n)}>
                  <button className="nr-card-edit" title="Edit" onClick={(e) => { e.stopPropagation(); openEditNews(n); }} />
                  <div className="nr-card-media" style={n.headline_image ? { backgroundImage: `url(${n.headline_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#e0e0e0' }} />
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
                    <div className="ec-td ec-actions">
                      <button className="cm-btn cm-btn--dark" onClick={() => editContact(c)}>Edit</button>
                      <button className="cm-btn cm-btn--danger" onClick={() => deleteContact(c.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {confirmModal.open && (
          <div className="confirm-modal-backdrop" onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}>
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
                  onChange={handleHeadlineImageUpload}
                />
                {newsForm.headlineImage && (
                  <button type="button" className="nr-drop-remove" aria-label="remove" onClick={(e) => { e.stopPropagation(); removeHeadlineImage(); }}>
                    Remove
                  </button>
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
                      newsContentModal.newsItem.headline_image
                        ? { backgroundImage: `url(${newsContentModal.newsItem.headline_image})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '300px' }
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
      </div>
    </div>
  );
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
  );
}

export default ContentManagement

