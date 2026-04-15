import React, { useEffect, useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../style/content.css";
import "../style/newsroom.css";
import { AuthContext } from "../../context/AuthContext";
import apiClient from "../../utils/apiClient";

function NewsRoom() {
  const navigate = useNavigate();
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({
    id: null,
    title: "",
    description: "",
    author: "",
    date: "",
    image: "",
  });
  const fileRef = useRef(null);
  const { user } = useContext(AuthContext);

  console.log("[DEBUG] ContentManagement page user:", user);

  // default images for the three cards (place files in /public)
  const defaultImages = {
    1: "/news_firefighters.jpg",
    2: "/news2.jpg",
    3: "/news3.jpg",
  };

  // loadNews moved out of useEffect for reuse
  const loadNews = async () => {
    try {
      const json = await apiClient.get("/news");
      const data = json?.data || [];

      // Map DB fields to UI expected shape
      const mapped = (data || []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        author: r.users?.full_name || "",
        date: r.published_at
          ? new Date(r.published_at).toLocaleDateString("en-US", {
              month: "long",
              day: "2-digit",
              year: "numeric",
            })
          : r.date
            ? new Date(r.date).toLocaleDateString()
            : "",
        image: r.headline_image || defaultImages[r.id] || "",
        additionalImages: r.additional_images || [],
      }));

      setItems(mapped);
    } catch (e) {
      console.error("Error loading news:", e);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const openCreate = () => {
    setForm({
      id: null,
      title: "",
      description: "",
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      }),
      image: "",
    });
    setShowNewsModal(true);
  };
  const openEdit = (n) => {
    setForm({
      id: n.id,
      title: n.title,
      description: n.description || "",
      date: n.date || "",
      image: n.image || "",
    });
    setShowNewsModal(true);
  };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () =>
      setForm((prev) => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(f);
  };
  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () =>
      setForm((prev) => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(f);
  };
  const saveNews = async (e) => {
    if (e) e.preventDefault();
    if (!form.title.trim()) return;

    try {
      const payload = {
        title: form.title,
        description: form.description,
        headline_image: form.image || null,
        additional_images: form.additionalImages || [],
        published: true,
      };

      const isEdit = Boolean(form.id);

      if (isEdit) {
        await apiClient.put(`/news/${form.id}`, payload);
      } else {
        await apiClient.post("/news", payload);
      }

      alert("News saved successfully!");
      setShowNewsModal(false);
      setForm({ id: null, title: "", description: "", date: "", image: "" });
      // reload from DB
      await loadNews();
    } catch (err) {
      console.error("Failed to save news:", err);
      alert("Failed to save news. See console for details.");
    }
  };

  const confirmDeleteNews = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Please enter your password");
      return;
    }
    try {
      setDeleteLoading(true);
      setDeleteError("");

      // Verify password
      await apiClient.post("/verify-password", {
        password: deletePassword,
      });

      // Password verified, proceed with delete
      await apiClient.delete(`/news/${deleteTarget.id}`);

      setDeleteTarget(null);
      setDeletePassword("");
      setDeleteError("");
      await loadNews();
      alert("News deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleteError(err?.message || "Incorrect password or delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = items.filter((n) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [n.title, n.description, n.author, n.date].some((v) =>
      (v || "").toLowerCase().includes(q),
    );
  });

  return (
    <div className="cm-wrapper">
      <div className="cm-tabs">
        <button className="cm-tab cm-tab-active">News Room</button>
        <button className="cm-tab" onClick={() => navigate("/content")}>
          Safety Tips
        </button>
        <button className="cm-tab" onClick={() => navigate("/contacts")}>
          Emergency Contacts
        </button>
      </div>

      <div className="cm-card">
        <div className="nr-list-head">
          <div className="nr-list-title">
            <h2>News awdawdawdRoom</h2>
            <p>
              For posting general articles, announcements, and updates from BFP
            </p>
          </div>
        </div>
        <div className="nr-list-toolbar">
          <div className="cm-search">
            <span className="cm-search-icon" />
            <input
              className="cm-search-input"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="cm-small-btn cm-small-btn--outline"
            onClick={openCreate}
          >
            + Add news
          </button>
        </div>

        <div className="nr-grid">
          {filtered.map((n) => (
            <div key={n.id} className="nr-card">
              <div
                className="nr-card-media"
                style={{
                  backgroundImage: `url(${n.image || defaultImages[n.id] || ""})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="nr-card-actions">
                  <button
                    className="nr-card-edit-btn"
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(n);
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="nr-card-delete-btn"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(n);
                      setDeletePassword("");
                      setDeleteError("");
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
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
              <h2 className="nr-title">News Room CMS</h2>
              <div className="nr-spacer" />
            </div>
            <div className="nr-sheet">
              <form className="nr-form">
                <div className="nr-field">
                  <label htmlFor="headline-file">
                    Headline Photo{" "}
                    <span className="nr-help">Main image for the article</span>
                  </label>
                  <div
                    className="nr-dropzone nr-dropzone--xl"
                    style={
                      form.image
                        ? {
                            backgroundImage: `url(${form.image})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                    onClick={() => fileRef.current && fileRef.current.click()}
                    onDragOver={(e) => e.preventDefault()}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm((p) => ({ ...p, image: "" }));
                        }}
                      />
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    id="headline-file"
                    type="file"
                    accept="image/*"
                    onChange={onFile}
                    style={{ display: "none" }}
                  />
                </div>
                <div className="nr-field">
                  <label>Headline or Title</label>
                  <input
                    className="nr-input"
                    placeholder="Value"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="nr-field">
                  <label>Description</label>
                  <textarea
                    className="nr-input"
                    rows="3"
                    placeholder="Value"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                {/* Author field removed, author is now inferred from logged-in user */}
                <div className="nr-field">
                  <label>
                    Additional Photos{" "}
                    <span className="nr-help">
                      optional extra images for more content
                    </span>
                  </label>
                  <div className="nr-dropzone nr-dropzone--sm">
                    <span className="nr-drop-icon" />
                  </div>
                </div>
                <div className="nr-actions">
                  <button type="button" className="nr-post" onClick={saveNews}>
                    <i className="fa-solid fa-paper-plane"></i>
                    <span>{form.id ? "Update News" : "Post News"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="nr-delete-overlay">
          <div className="nr-delete-modal">
            <h3>Delete News Article</h3>
            <p>
              Are you sure you want to delete{" "}
              <strong>"{deleteTarget.title}"</strong>?
            </p>
            <p className="nr-delete-warning">
              This action cannot be undone. Enter your password to confirm.
            </p>
            <input
              type="password"
              className="nr-delete-password"
              placeholder="Enter your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmDeleteNews()}
            />
            {deleteError && <p className="nr-delete-error">{deleteError}</p>}
            <div className="nr-delete-actions">
              <button
                className="nr-delete-confirm"
                onClick={confirmDeleteNews}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                className="nr-delete-cancel"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                disabled={deleteLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsRoom;
