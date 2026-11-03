import { Link } from 'react-router-dom'
import { adminApi } from '../admin-api.js'
import { useAdminData } from '../use-admin-data.js'
import { categoryLabel, statusLabel, INQUIRY_STATUS_LABELS, PROJECT_TYPES, label, formatDateTime, relativeDays } from '../../lib/format.js'
import { variants } from '../../lib/images.js'
import { AdmEmpty, AdmError, AdmLoading, DistBars, SeriesBars, useTitle } from '../ui.jsx'

function Panel({ title, aside, children }) {
  return (
    <section className="adm-panel">
      <div className="adm-panel__head">
        <h2>{title}</h2>
        {aside ? <span className="adm-right adm-help">{aside}</span> : null}
      </div>
      <div className="adm-panel__body">{children}</div>
    </section>
  )
}

function LedgerRow({ k, v, sub }) {
  return (
    <div className="adm-ledger__row">
      <span className="adm-ledger__k">{k}{sub ? <span className="adm-muted"> · {sub}</span> : null}</span>
      <span className="adm-ledger__dots" />
      <span className="adm-ledger__v">{v}</span>
    </div>
  )
}

export default function DashboardPage() {
  useTitle('Dashboard')
  const { data, loading, error, reload } = useAdminData(() => adminApi.analytics(), [])

  if (loading) return <AdmLoading message="Loading the studio overview…" />
  if (error) return <AdmError error={error} onRetry={reload} />
  if (!data) return <AdmEmpty title="No overview data" />

  const t = data.totals ?? {}
  const portfolio = (data.portfolio ?? []).map((r) => ({ label: categoryLabel(r.category), count: r.count }))
  const pipeline = (data.pipeline ?? []).map((r) => ({ label: label(INQUIRY_STATUS_LABELS, r.status), count: r.count }))
  const demand = (data.demand ?? []).map((r) => ({ label: label(PROJECT_TYPES, r.projectType), count: r.count }))
  const monthly = data.series?.monthly ?? []
  const daily = data.series?.daily ?? []
  const firstName = (data.admin?.name ?? 'there').split(' ')[0]
  const monthTotal = monthly.reduce((sum, d) => sum + d.value, 0)
  const dayTotal = daily.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="adm-stack" style={{ gap: 20 }}>
      <div className="adm-dash-lead">
        <p className="adm-eyebrow">Overview</p>
        <h1>Good to see you, {firstName}.</h1>
        <p className="adm-muted" style={{ width: '100%', fontSize: '0.85rem' }}>
          Last sign-in {data.admin?.lastLoginAt ? formatDateTime(data.admin.lastLoginAt) : '—'}. Everything below reflects live content.
        </p>
      </div>

      <div className="adm-metricgrid">
        <Panel title="Today at the desk">
          <div className="adm-ledger">
            <LedgerRow k="Projects" v={t.projects ?? 0} sub={`${t.publishedProjects ?? 0} live · ${t.draftProjects ?? 0} draft`} />
            <LedgerRow k="Featured" v={t.featuredProjects ?? 0} sub={`of ${t.projects ?? 0}`} />
            <LedgerRow k="Gallery images" v={t.images ?? 0} />
            <LedgerRow k="Services" v={t.services ?? 0} sub={`${t.publishedServices ?? 0} live`} />
            <LedgerRow k="Testimonials" v={t.testimonials ?? 0} />
            <LedgerRow k="Team" v={t.team ?? 0} />
          </div>
        </Panel>

        <Panel title="Inbound enquiries" aside={`${monthTotal} in 12 mo`}>
          <div style={{ marginBottom: 14 }}>
            <p className="adm-help" style={{ marginBottom: 6 }}>Last 12 months</p>
            <SeriesBars data={monthly} />
          </div>
          <div>
            <p className="adm-help" style={{ marginBottom: 6 }}>Last 30 days · {dayTotal} total</p>
            <SeriesBars data={daily} dense />
          </div>
        </Panel>

        <Panel title="Enquiry pipeline" aside={`${(t.replyRate ?? 0)}% replied`}>
          <div className="adm-gap" style={{ marginBottom: 12 }}>
            <span className="adm-pill adm-pill--new">{t.newInquiries ?? 0} new</span>
            <span className="adm-pill">{t.weekInquiries ?? 0} in last 7 days</span>
          </div>
          <DistBars rows={pipeline} emptyLabel="No enquiries yet." />
        </Panel>

        <Panel title="Portfolio & demand">
          <p className="adm-help" style={{ marginBottom: 8 }}>Projects by category</p>
          <DistBars rows={portfolio} emptyLabel="No projects yet." />
          <div className="adm-divider" style={{ margin: '16px 0' }} />
          <p className="adm-help" style={{ marginBottom: 8 }}>Enquiries by project type</p>
          <DistBars rows={demand} emptyLabel="No enquiries yet." />
        </Panel>
      </div>

      <div className="adm-metricgrid">
        <Panel title="Recent enquiries" aside={<Link className="adm-link" to="/admin/inquiries">Open inbox</Link>}>
          <RecentInquiries rows={data.recent?.inquiries ?? []} />
        </Panel>
        <Panel title="Recently edited projects" aside={<Link className="adm-link" to="/admin/projects">All projects</Link>}>
          <RecentProjects rows={data.recent?.projects ?? []} />
        </Panel>
      </div>
    </div>
  )
}

function RecentInquiries({ rows }) {
  if (rows.length === 0) return <p className="adm-help">No enquiries have arrived yet.</p>
  return (
    <div className="adm-table-scroll">
      <table className="adm-table adm-table--dense">
        <thead>
          <tr><th>Name</th><th>Type</th><th>Status</th><th>Received</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link className="adm-cell-title adm-link" to={`/admin/inquiries/${r.id}`}>{r.name}</Link>
                <div className="adm-cell-slug">{r.email}</div>
              </td>
              <td className="adm-cell-2">{label(PROJECT_TYPES, r.projectType)}</td>
              <td><span className={`adm-pill adm-pill--${String(r.status).toLowerCase()}`}>{label(INQUIRY_STATUS_LABELS, r.status)}</span></td>
              <td className="adm-cell-2 adm-tabnum">{relativeDays(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecentProjects({ rows }) {
  if (rows.length === 0) return <p className="adm-help">No projects yet.</p>
  return (
    <ul className="adm-stack" style={{ gap: 10 }}>
      {rows.map((r) => (
        <li key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <img className="adm-thumb" src={variants(r.coverImageUrl).smallJpg} alt="" width="56" height="38" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Link className="adm-cell-title adm-link" to={`/admin/projects/${r.id}`}>{r.title}</Link>
            <div className="adm-cell-slug">
              {statusLabel(r.status)} · {r.published ? 'Published' : 'Draft'} · updated {relativeDays(r.updatedAt)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
