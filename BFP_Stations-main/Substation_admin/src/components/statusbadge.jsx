export default function StatusBadge({ label }) {
  const statusStyles = {
    upcoming: {
      bg: "#FFF7D6",
      color: "#C9A300",
      dot: "#E2BB00",
    },
    completed: {
      bg: "#DFFFE5",
      color: "#0F8A35",
      dot: "#1DB954",
    },
    ongoing: {
      bg: "#DDEBFF",
      color: "#1A5AD7",
      dot: "#1A73E8",
    },
    cancelled: {
      bg: "#FFE1E1",
      color: "#CC0000",
      dot: "#D93025",
    },
  };

  const key = label?.toLowerCase();
  const style = statusStyles[key] || statusStyles["ongoing"];

  return (
    <div
      className="status-badge"
      style={{
        background: style.bg,
        color: style.color,
      }}
    >
      <span
        className="status-dot"
        style={{ background: style.dot }}
      ></span>
      {label}
    </div>
  );
}
