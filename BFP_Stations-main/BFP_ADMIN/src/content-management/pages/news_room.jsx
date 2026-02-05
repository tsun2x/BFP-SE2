import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../style/content.css'
import '../style/newsroom.css'

function NewsRoom() {
  const navigate = useNavigate()
  const [showNewsModal, setShowNewsModal] = useState(false)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ id: null, title: '', description: '', author: '', date: '', image: '' })
  const fileRef = useRef(null)

  // default images for the three cards (place files in /public)
  const defaultImages = {
    1: '/news_firefighters.jpg',
    2: '/news2.jpg',
    3: '/news3.jpg',
  }

  // load from localStorage or seed defaults
  useEffect(() => {
    try {
      const saved = localStorage.getItem('newsItems')
      if (saved) {
        const parsed = JSON.parse(saved)
        // ensure default images if any are missing, and force id=1 to use our provided image
        const withImages = parsed.map((it) => ({
          ...it,
          image: it.id === 1 ? defaultImages[1] : (it.image || defaultImages[it.id] || it.image),
        }))
        setItems(withImages)
        return
      }
    } catch {}
    setItems([
      { id: 1, title: '“3-Alarm Fire Controlled in ZC”', date: 'October 03, 2025', image: defaultImages[1], description: '', author: '' },
      { id: 2, title: '“Grass Fire Spreads Near Vacant Lot in San Pedro”', date: 'October 12, 2025', image: defaultImages[2], description: '', author: '' },
      { id: 3, title: '“Kitchen Fire Contained in San Pedro Residence”', date: 'October 19, 2025', image: defaultImages[3], description: '', author: '' },
    ])
  }, [])

  useEffect(() => {
    try { localStorage.setItem('newsItems', JSON.stringify(items)) } catch {}
  }, [items])

  const openCreate = () => {
    setForm({ id: null, title: '', description: '', author: '', date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }), image: '' })
    setShowNewsModal(true)
  }
  const openEdit = (n) => {
    setForm({ id: n.id, title: n.title, description: n.description || '', author: n.author || '', date: n.date || '', image: n.image || '' })
    setShowNewsModal(true)
  }
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setForm((prev) => ({ ...prev, image: reader.result }))
    reader.readAsDataURL(f)
  }
  const onDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setForm((prev) => ({ ...prev, image: reader.result }))
    reader.readAsDataURL(f)
  }
  const saveNews = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setItems((prev) => {
      if (form.id) {
        return prev.map((it) => (it.id === form.id ? { ...it, ...form } : it))
      }
      const nextId = prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1
      return [...prev, { ...form, id: nextId }]
    })
    setShowNewsModal(false)
  }
  const filtered = items.filter((n) => {
    const q = search.toLowerCase()
    if (!q) return true
    return [n.title, n.description, n.author, n.date].some((v) => (v || '').toLowerCase().includes(q))
  })

  return (
    <div className="cm-wrapper">
      <div className="cm-tabs">
        <button className="cm-tab cm-tab-active">News Room</button>
        <button className="cm-tab" onClick={()=>navigate('/content')}>Safety Tips</button>
        <button className="cm-tab" onClick={()=>navigate('/contacts')}>Emergency Contacts</button>
      </div>

      <div className="cm-card">
        <div className="nr-list-head">
          <div className="nr-list-title">
            <h2>News Room</h2>
            <p>For posting general articles, announcements, and updates from BFP</p>
          </div>
        </div>
        <div className="nr-list-toolbar">
          <div className="cm-search">
            <span className="cm-search-icon" />
            <input className="cm-search-input" placeholder="Search" value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>
          <button className="cm-small-btn cm-small-btn--outline" onClick={openCreate}>+ Add news</button>
        </div>

        <div className="nr-grid">
          {filtered.map((n) => (
            <div key={n.id} className="nr-card" onClick={() => openEdit(n)}>
              <button className="nr-card-edit" title="Edit" onClick={(e)=>{ e.stopPropagation(); openEdit(n) }} />
              <div className="nr-card-media" style={{ backgroundImage: `url(${n.image || defaultImages[n.id] || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="nr-card-body">
                <h3 className="nr-card-title">{n.title}</h3>
                <p className="nr-card-date">{n.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNewsModal && (
        <div className="nr-modal-overlay" role="dialog" aria-modal="true">
          <div className="nr-modal">
            <div className="nr-modal-header">
              <button className="nr-back" onClick={() => setShowNewsModal(false)}>Back</button>
              <h2 className="nr-title">News Room CMS</h2>
              <div className="nr-spacer" />
            </div>
            <div className="nr-sheet">
              <form className="nr-form" onSubmit={saveNews}>
                <div className="nr-field">
                  <label htmlFor="headline-file">Headline Photo <span className="nr-help">Main image for the article</span></label>
                  <div
                    className="nr-dropzone nr-dropzone--xl"
                    style={form.image ? { backgroundImage: `url(${form.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    onClick={() => fileRef.current && fileRef.current.click()}
                    onDragOver={(e)=>e.preventDefault()}
                    onDrop={onDrop}
                    role="button"
                    aria-label="Upload headline photo"
                  >
                    {!form.image && <span className="nr-drop-icon" />}
                    {form.image && (
                      <button
                        type="button"
                        className="nr-drop-remove"
                        aria-label="remove"
                        onClick={(e)=>{ e.stopPropagation(); setForm((p)=>({...p, image:''})) }}
                      />
                    )}
                  </div>
                  <input ref={fileRef} id="headline-file" type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
                </div>
                <div className="nr-field"><label>Headline or Title</label><input className="nr-input" placeholder="Value" value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} /></div>
                <div className="nr-field"><label>Description</label><textarea className="nr-input" rows="3" placeholder="Value" value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} /></div>
                <div className="nr-field"><label>Author</label><input className="nr-input nr-input--sm" placeholder="Value" value={form.author} onChange={(e)=>setForm({...form, author:e.target.value})} /></div>
                <div className="nr-field"><label>Additional Photos <span className="nr-help">optional extra images for more content</span></label><div className="nr-dropzone nr-dropzone--sm"><span className="nr-drop-icon" /></div></div>
                <div className="nr-actions"><button type="submit" className="nr-post">{form.id ? 'Update News' : 'Post News'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewsRoom
