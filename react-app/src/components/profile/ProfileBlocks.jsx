export function ProfileSectionCard({ title, eyebrow, children, actions = null, className = '' }) {
  return (
    <section className={`profile-section-card ${className}`.trim()}>
      <div className="profile-section-card__header">
        <div>
          {eyebrow && <div className="profile-section-card__eyebrow">{eyebrow}</div>}
          <h2>{title}</h2>
        </div>
        {actions && <div className="profile-section-card__actions">{actions}</div>}
      </div>
      <div className="profile-section-card__body">{children}</div>
    </section>
  )
}

export function TagCloud({ items = [], emptyText = 'No items listed yet.' }) {
  if (!items.length) {
    return <div className="profile-empty-state">{emptyText}</div>
  }

  return (
    <div className="profile-tag-cloud">
      {items.map((item) => (
        <span key={item} className="profile-tag-pill">{item}</span>
      ))}
    </div>
  )
}

export function TimelineList({ items = [], emptyText = 'No timeline items available yet.' }) {
  if (!items.length) {
    return <div className="profile-empty-state">{emptyText}</div>
  }

  return (
    <div className="profile-timeline-list">
      {items.map((item, index) => (
        <article key={`${item.title}-${index}`} className={`profile-timeline-item tone-${item.tone || 'default'}`}>
          <div className="profile-timeline-marker" />
          <div className="profile-timeline-content">
            <div className="profile-timeline-date">{item.date || '—'}</div>
            <h3>{item.title}</h3>
            {item.meta && <p>{item.meta}</p>}
          </div>
        </article>
      ))}
    </div>
  )
}
