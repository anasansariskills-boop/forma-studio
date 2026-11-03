import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './lib/prisma.js'
import { ensureUploadDir } from './lib/storage.js'

async function bootstrap() {
  await ensureUploadDir()
  await prisma.$connect()

  const server = createApp().listen(config.port, () => {
    console.log(`FORMA API listening on http://localhost:${config.port} (${config.env})`)
  })

  let closing = false
  const shutdown = async (signal) => {
    if (closing) return
    closing = true
    console.log(`\n${signal} received — closing connections.`)
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
    // Never wait forever on keep-alive sockets.
    setTimeout(() => process.exit(1), 8000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason))
}

bootstrap().catch((error) => {
  console.error(`Failed to start the FORMA API: ${error.message}`)
  if (/Can't reach database server|P1001|ECONNREFUSED/.test(error.message)) {
    console.error('Start PostgreSQL first:  npm run db:start')
  }
  process.exit(1)
})
