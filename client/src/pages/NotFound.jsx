import { Link } from 'react-router-dom'
import { useApi, useSeo } from '../lib/hooks.js'
import { publicApi } from '../lib/api.js'
import ProjectIndex from '../components/ProjectIndex.jsx'
import Photo from '../components/Photo.jsx'
import '../styles/notfound.css'

export default function NotFound() {
  useSeo({ title: 'Page not found — FORMA Studio', description: 'That page does not exist.', path: '/404' })
  const recent = useApi(() => publicApi.projects({ sort: 'recent', perPage: 3 }), [])

  return (
    <section className="wrap nf">
      <div className="nf__text">
        <p className="label label--ink">Error 404</p>
        <h1 className="display nf__code">Not<br />found</h1>
        <p className="lead measure">
          That page is not part of the studio site. It may have been renamed when the portfolio was re-ordered.
        </p>
        <div className="hero__actions" style={{ marginTop: 22 }}>
          <Link className="btn" to="/">Back to the front page</Link>
          <Link className="btn btn--clay" to="/projects">See the projects</Link>
        </div>
      </div>

      <div className="nf__aside">
        <p className="label label--ink">Recently added</p>
        {recent.data?.projects?.length > 0 && <ProjectIndex projects={recent.data.projects} />}
        <div className="nf__photo">
          <Photo src="/img/about/atelier.jpg" alt="The FORMA drawing room, lit from the north" layout="cover" />
        </div>
      </div>
    </section>
  )
}
