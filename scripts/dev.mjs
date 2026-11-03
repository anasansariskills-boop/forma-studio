#!/usr/bin/env node
/**
 * One command for the whole development stack:
 *
 *   npm run dev
 *
 * Boots the embedded PostgreSQL server, the Express API and the Vite client as
 * child processes, prefixes their output so the three streams stay readable,
 * and shuts all of them down on Ctrl+C or if one of them dies.
 *
 * Anything already listening on a port is reused rather than restarted, so this
 * is safe to run when a database or server from an earlier session is still up.
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const PORTS = { db: 55432, api: 8787, web: 5173 }
const COLORS = { db: '\x1b[38;5;137m', api: '\x1b[38;5;108m', web: '\x1b[38;5;114m', off: '\x1b[0m' }
const children = new Map()
let shuttingDown = false

function log(label, message) {
  process.stdout.write(`${COLORS[label]}${label.padEnd(4)}${COLORS.off} │ ${message}\n`)
}

function probe(host, port) {
  return new Promise((fulfilled) => {
    const socket = net.connect({ host, port })
    const done = (open) => {
      socket.destroy()
      fulfilled(open)
    }
    socket.setTimeout(1200)
    socket.on('connect', () => done(true))
    socket.on('error', () => done(false))
    socket.on('timeout', () => done(false))
  })
}

// Vite binds to "localhost", which on Windows usually resolves to ::1 only —
// probing the loopback v4 address alone would report a live server as down.
async function portIsOpen(port) {
  return (await probe('127.0.0.1', port)) || (await probe('::1', port))
}

async function waitForPort(port, label, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await portIsOpen(port)) return true
    await new Promise((wait) => setTimeout(wait, 400))
  }
  log('off', `${label} did not come up on port ${port} within ${timeoutMs / 1000}s.`)
  return false
}

/** Start a child process, inheriting its stdio so colours and logs pass through. */
async function run(label, command, args, options = {}) {
  if (options.skipIfPort && (await portIsOpen(options.skipIfPort))) {
    log(label, `port ${options.skipIfPort} is already in use — reusing what is running there.`)
    return null
  }
  if (options.file && !existsSync(options.file)) {
    log('off', `Missing ${options.file} — run npm install first.`)
    shutdown(1)
    return null
  }

  log(label, `npm run ${options.script ?? label}`)
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
  })

  const write = (chunk) => {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (line.trim()) process.stdout.write(`${COLORS[label]}${label.padEnd(4)}${COLORS.off} │ ${line}\n`)
    }
  }
  child.stdout.on('data', write)
  child.stderr.on('data', write)

  child.on('exit', (code, signal) => {
    children.delete(child)
    if (shuttingDown) return
    log(label, `exited (${signal ?? `code ${code}`}) — stopping the stack.`)
    shutdown(code === 0 ? 1 : (code ?? 1))
  })

  children.set(child, label)
  return child
}

async function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const [child, label] of children) {
    log(label, 'stopping …')
    if (process.platform === 'win32') {
      // taskkill /T reaches the grandchildren that stdio-inheriting shells leave behind.
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    } else {
      child.kill('SIGTERM')
    }
  }
  // Give the database a moment to close cleanly before the process leaves.
  setTimeout(() => process.exit(code), children.size ? 1200 : 0)
}

async function main() {
  console.log('\n  FORMA Studio — development stack\n')

  if (!(await portIsOpen(PORTS.db))) {
    await run('db', process.execPath, [join(root, 'scripts', 'db.mjs'), 'start'], { script: 'db:start' })
    if (!(await waitForPort(PORTS.db, 'database'))) shutdown(1)
  } else {
    log('db', `reusing PostgreSQL already listening on ${PORTS.db}`)
  }

  await run('api', process.execPath, ['--watch', 'src/index.js'], {
    cwd: join(root, 'server'),
    script: 'dev:server',
    skipIfPort: PORTS.api,
  })

  await run('web', process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORTS.web)], {
    cwd: join(root, 'client'),
    script: 'dev:client',
    skipIfPort: PORTS.web,
  })

  if (await waitForPort(PORTS.web, 'client', 60000)) {
    console.log(`\n  site   http://localhost:${PORTS.web}`)
    console.log(`  api    http://localhost:${PORTS.api}/api/health`)
    console.log(`  admin  http://localhost:${PORTS.web}/admin\n`)
  }
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

main().catch((error) => {
  console.error(`[dev] ${error.message}`)
  shutdown(1)
})
