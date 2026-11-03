import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import SiteHeader from './components/SiteHeader.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import Home from './pages/Home.jsx'
import Projects from './pages/Projects.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import About from './pages/About.jsx'
import Services from './pages/Services.jsx'
import Contact from './pages/Contact.jsx'
import NotFound from './pages/NotFound.jsx'
import { SiteContext } from './lib/site-context.js'
import { publicApi } from './lib/api.js'
import { useApi } from './lib/hooks.js'
import { Loading } from './components/StateBlock.jsx'

// The dashboard is a separate app: split it so public visitors never download it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // instant, because html has scroll-behavior: smooth and navigation should
    // not animate from the bottom of the previous page.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

function PublicShell({ children }) {
  return (
    <>
      <ScrollToTop />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  )
}

export default function App() {
  // One request feeds the header, footer and every contact block.
  const site = useApi(() => publicApi.site(), [])

  const value = {
    studio: site.data?.studio ?? null,
    portfolio: site.data?.portfolio ?? null,
    loading: site.loading,
    error: site.error,
  }

  return (
    <SiteContext.Provider value={value}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<Loading message="Loading the studio dashboard…" />}>
                <AdminApp />
              </Suspense>
            }
          />
          <Route path="/" element={<PublicShell><Home /></PublicShell>} />
          <Route path="/projects" element={<PublicShell><Projects /></PublicShell>} />
          <Route path="/projects/:slug" element={<PublicShell><ProjectDetail /></PublicShell>} />
          <Route path="/about" element={<PublicShell><About /></PublicShell>} />
          <Route path="/services" element={<PublicShell><Services /></PublicShell>} />
          <Route path="/contact" element={<PublicShell><Contact /></PublicShell>} />
          <Route path="*" element={<PublicShell><NotFound /></PublicShell>} />
        </Routes>
      </BrowserRouter>
    </SiteContext.Provider>
  )
}
