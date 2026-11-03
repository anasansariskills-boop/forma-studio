import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../admin-api.js'
import { useAdminData } from '../use-admin-data.js'
import { BUDGET_LABELS, INQUIRY_STATUS_LABELS, PROJECT_TYPES, label, relativeDays } from '../../lib/format.js'
import { AdmEmpty, AdmError, AdmLoading, Icon, Pagination, useTitle } from '../ui.jsx'

const PER_PAGE = 15

export default function InquiriesPage() {
  useTitle('Inquiries')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchDraft.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [searchDraft])

  const { data, loading, error, reload } = useAdminData(
    () => adminApi.inquiries({ search: search || undefined, status: status || undefined, page, perPage: PER_PAGE }),
    [search, status, page],
  )
  const inquiries = data?.inquiries ?? []
  const counts = data?.counts ?? {}

  return (
    <div className="adm-stack">
      <div><p className="adm-eyebrow">Studio</p><h1 className="adm-h" style={{ fontSize: '1.6rem' }}>Project inquiries</h1><p className="adm-help">Opening a new inquiry marks it as read. Replies happen in your email client; the pipeline is tracked here.</p></div>
      <div className="adm-tabs" role="tablist" aria-label="Filter inquiries by status">
        {['', ...Object.keys(INQUIRY_STATUS_LABELS)].map((value) => <button key={value || 'ALL'} className="adm-tab" role="tab" aria-selected={status === value} onClick={() => { setStatus(value); setPage(1) }}>{value ? label(INQUIRY_STATUS_LABELS, value) : 'All'} <span className="adm-tab__n">{counts[value || 'ALL'] ?? 0}</span></button>)}
      </div>
      <div className="adm-toolbar"><div className="adm-search"><Icon name="search" /><label className="adm-visuallyhidden" htmlFor="inquiry-search">Search inquiries</label><input id="inquiry-search" className="adm-input" type="search" placeholder="Search name, email, location or message…" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} /></div></div>
      {loading ? <AdmLoading message="Loading inquiries…" /> : error ? <AdmError error={error} onRetry={reload} /> : inquiries.length === 0 ? <AdmEmpty title="No inquiries found" body={search || status ? 'Try another search or status filter.' : 'New website enquiries will appear here.'} /> : (
        <>
          <div className="adm-table-scroll"><table className="adm-table"><thead><tr><th>Contact</th><th>Project</th><th>Budget</th><th>Status</th><th>Received</th><th aria-label="Open" /></tr></thead><tbody>
            {inquiries.map((item) => <tr key={item.id}>
              <td><Link className="adm-cell-title adm-link" to={`/admin/inquiries/${item.id}`}>{item.name}</Link><div className="adm-cell-slug">{item.email}</div></td>
              <td><span>{label(PROJECT_TYPES, item.projectType)}</span><div className="adm-cell-slug">{item.location || item.excerpt.slice(0, 62)}{!item.location && item.truncated ? '…' : ''}</div></td>
              <td className="adm-cell-2">{item.budget ? label(BUDGET_LABELS, item.budget) : '—'}</td>
              <td><span className={`adm-pill adm-pill--${item.status.toLowerCase()}`}>{label(INQUIRY_STATUS_LABELS, item.status)}</span></td>
              <td className="adm-cell-2 adm-tabnum">{relativeDays(item.createdAt)}</td>
              <td><Link className="adm-btn adm-btn--sm" to={`/admin/inquiries/${item.id}`}>Open</Link></td>
            </tr>)}
          </tbody></table></div>
          <Pagination pagination={data?.pagination} onPage={setPage} />
        </>
      )}
    </div>
  )
}
