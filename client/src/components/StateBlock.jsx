/** The three non-content states the brief asks for, in one place. */
export default function StateBlock({ kind, title, body, action, compact = false }) {
  return (
    <div className={`state ${compact ? '' : 'state--center'}`} role="status" aria-live="polite">
      {kind === 'loading' && <span className="spinner" aria-hidden="true" />}
      {kind === 'empty' && <span className="label label--ink">Nothing here</span>}
      {kind === 'error' && <span className="label" style={{ color: 'var(--clay-deep)' }}>Problem</span>}
      {title && <p className="lead">{title}</p>}
      {body && <p className="field-hint">{body}</p>}
      {action}
    </div>
  )
}

export const Loading = ({ message = 'Loading…' }) => <StateBlock kind="loading" title={message} />

export const ErrorState = ({ error, onRetry }) => (
  <StateBlock
    kind="error"
    title={error?.message ?? 'Something went wrong.'}
    body={
      error?.status === 0
        ? 'The studio server is not responding.'
        : error?.status === 404
          ? 'It may have been renamed or unpublished.'
          : 'The content could not be loaded. Please try again.'
    }
    action={
      error?.status !== 404 &&
      onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      )
    }
  />
)

export const EmptyState = ({ title = 'Nothing to show yet.', body, action }) => (
  <StateBlock kind="empty" title={title} body={body} action={action} />
)

/** Placeholder blocks that match the real layout so loading does not jump. */
export const SkeletonRows = ({ rows = 4, height = 62 }) => (
  <div aria-hidden="true" style={{ display: 'grid', gap: 12 }}>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="skeleton" style={{ height, borderRadius: 2 }} />
    ))}
  </div>
)

export const SkeletonPhoto = ({ ratio = '16 / 10' }) => (
  <div className="skeleton" aria-hidden="true" style={{ aspectRatio: ratio, borderRadius: 2 }} />
)
