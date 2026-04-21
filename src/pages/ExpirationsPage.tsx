/*
 * Page expirations masquée : contenu métier non pris en charge dans cette version du front.
 */
export default function ExpirationsPage() {
  return (
    <div className="gf-page">
      <div
        role="status"
        style={{
          padding: '16px 20px',
          borderRadius: 10,
          border: '1px solid var(--gf-border)',
          background: 'var(--gf-white)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--gf-dark)',
          boxShadow: 'var(--gf-shadow-card)',
        }}
      >
        Pas pris en compte dans le projet Vue.js
      </div>
    </div>
  );
}
