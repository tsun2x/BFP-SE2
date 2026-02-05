import CMContent from "../content-management/pages/content_management.jsx";

export default function ContentManagement() {
  return (
    <div className="page-container" style={{ height: "100%" }}>
      <h1 className="page-title">Content Management</h1>
      <div style={{ height: "calc(100% - 64px)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", background: "#fff", padding: 16 }}>
        <CMContent />
      </div>
    </div>
  );
}
