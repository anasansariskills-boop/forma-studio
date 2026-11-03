import Photo from './Photo.jsx'

/**
 * Shared opening composition with three deliberately different layouts, so
 * every page starts with its own shape rather than the same banner twice.
 */
export default function Hero({
  variant = 'title',
  kicker,
  title,
  TitleTag = 'h1',
  lead,
  image,
  actions,
  aside,
  count,
  children,
}) {
  if (variant === 'full') {
    return (
      <section className="hero hero--full">
        {image?.src && (
          <div className="hero__media">
            <Photo src={image.src} alt={image.alt} layout="full" eager />
          </div>
        )}
        <div className="wrap hero__inner">
          {kicker && <p className="hero__kicker">{kicker}</p>}
          <TitleTag className="hero__title display">{title}</TitleTag>
          {lead && <p className="hero__lead measure">{lead}</p>}
          <div className="hero__foot">
            <div className="hero__actions">
              {actions}
              <span className="scrollcue" aria-hidden="true">
                <i />
                Scroll
              </span>
            </div>
            {aside && <div className="hero__aside">{aside}</div>}
          </div>
          {children}
        </div>
      </section>
    )
  }

  if (variant === 'split') {
    return (
      <section className="hero hero--split wrap">
        <div className="hero__text">
          {kicker && <p className="hero__kicker">{kicker}</p>}
          <TitleTag className="hero__title">{title}</TitleTag>
          {lead && <p className="hero__lead measure">{lead}</p>}
          {actions && <div className="hero__actions">{actions}</div>}
        </div>
        {image?.src && (
          <div className="hero__media">
            <Photo src={image.src} alt={image.alt} layout="half" eager />
          </div>
        )}
        {children}
      </section>
    )
  }

  return (
    <section className="hero hero--title wrap">
      <div className="hero__bar">
        <div>
          {kicker && <p className="hero__kicker">{kicker}</p>}
          <TitleTag className="hero__title" style={{ marginTop: kicker ? 14 : 0 }}>{title}</TitleTag>
        </div>
        {count && <p className="hero__count">{count}</p>}
      </div>
      {lead && <p className="hero__lead measure">{lead}</p>}
      {actions && <div className="hero__actions">{actions}</div>}
      {children}
    </section>
  )
}
