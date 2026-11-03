import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import authRoutes from './auth.js'
import projectRoutes from './projects.js'
import serviceRoutes from './services.js'
import testimonialRoutes from './testimonials.js'
import inquiryRoutes from './inquiries.js'
import analyticsRoutes from './analytics.js'
import studioRoutes from './studio.js'

const router = Router()

// Only /login is public; the rest of the auth router guards its own routes.
router.use('/auth', authRoutes)

router.use('/projects', requireAdmin, projectRoutes)
router.use('/services', requireAdmin, serviceRoutes)
router.use('/testimonials', requireAdmin, testimonialRoutes)
router.use('/inquiries', requireAdmin, inquiryRoutes)
router.use('/analytics', requireAdmin, analyticsRoutes)
router.use('/studio', requireAdmin, studioRoutes)

export default router
