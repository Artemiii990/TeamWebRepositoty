// Tiny presentational component - renders "ADMIN" / "MERCHANT" / "CUSTOMER"
// as a colored pill. Kept separate so the color-per-role mapping lives in one place 
// (see .role-badge--* rules in styles/shell.css).
function RoleBadge({ role }) {
  const className = `role-badge role-badge--${String(role).toLowerCase()}`;
  return <span className={className}>{role}</span>;
}

export default RoleBadge;