import { Link } from 'react-router-dom'

/** Text link with the hairline underline and trailing arrow from the stylesheet. */
export default function ArrowLink({ to, href, children, invert = false, ...rest }) {
  const className = `arrowlink ${invert ? 'invert' : ''}`.trim()
  if (href) {
    return (
      <a className={className} href={href} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link className={className} to={to} {...rest}>
      {children}
    </Link>
  )
}
