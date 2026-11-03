#!/usr/bin/env node
/**
 * Controls a real PostgreSQL server that is installed by the `embedded-postgres`
 * package into node_modules — no system service, Docker or admin rights needed.
 *
 *   node scripts/db.mjs init     create the data cluster + forma database (idempotent)
 *   node scripts/db.mjs start    boot the server and keep it in the foreground
 *   node scripts/db.mjs stop     shut a running server down cleanly
 *   node scripts/db.mjs status   report whether the server accepts connections
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'
import EmbeddedPostgres from 'embedded-postgres'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const databaseDir = join(root, '.pgdata')

const DB = {
  user: 'postgres',
  password: 'forma_local_pw',
  port: 55432,
  name: 'forma',
}

const nativeBin = ['windows-x64', 'windows-x64-real', 'darwin-arm64', 'darwin-x64', 'linux-x64']
  .map((pkg) => join(root, 'node_modules', '@embedded-postgres', pkg, 'native', 'bin'))
  .find((p) => existsSync(p))

function exe(name) {
  const suffix = process.platform === 'win32' ? '.exe' : ''
  if (!nativeBin) throw new Error('PostgreSQL binaries not found — run npm install first.')
  return join(nativeBin, `${name}${suffix}`)
}

function log(message) {
  process.stdout.write(`[db] ${message}\n`)
}

function createInstance() {
  return new EmbeddedPostgres({
    databaseDir,
    user: DB.user,
    password: DB.password,
    port: DB.port,
    persistent: true,
    onLog: (line) => process.stdout.write(`[pg] ${line}`),
    onError: (line) => process.stderr.write(`[pg] ${line}`),
  })
}

/** Run one of the bundled CLI tools (initdb and psql are not always shipped). */
function runTool(tool, args, options = {}) {
  return new Promise((fulfilled, rejected) => {
    const child = spawn(exe(tool), args, { windowsHide: true, ...options })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.on('error', rejected)
    child.on('close', (code) =>
      code === 0 || /already exists/i.test(output) ? fulfilled(output) : rejected(new Error(`${tool}: ${output}`)),
    )
  })
}

function portIsOpen() {
  return new Promise((fulfilled) => {
    const socket = net.connect({ host: 'localhost', port: DB.port })
    const done = (open) => {
      socket.destroy()
      fulfilled(open)
    }
    socket.setTimeout(1500)
    socket.on('connect', () => done(true))
    socket.on('error', () => done(false))
    socket.on('timeout', () => done(false))
  })
}

async function ensureDatabase(instance) {
  try {
    await instance.createDatabase(DB.name)
    log(`created database "${DB.name}"`)
  } catch (error) {
    if (!/already exists|duplicate/i.test(error.message)) throw error
  }
}

async function initialise() {
  if (existsSync(join(databaseDir, 'PG_VERSION'))) {
    log(`cluster already initialised at ${databaseDir}`)
  } else {
    log('running initdb …')
    const instance = createInstance()
    await instance.initialise()
    log('cluster initialised')
  }

  if (await portIsOpen()) {
    log(`server already up on ${DB.port}; run "npm run migrate" to create the schema`)
    return
  }

  // Boot transiently just to create the application database.
  const instance = createInstance()
  await instance.start()
  try {
    await ensureDatabase(instance)
  } finally {
    await instance.stop('fast')
  }
  log(`ready — connect with postgresql://${DB.user}:${DB.password}@localhost:${DB.port}/${DB.name}`)
}

async function start() {
  if (await portIsOpen()) {
    log(`a server is already listening on port ${DB.port}`)
    return
  }
  const instance = createInstance()
  if (!existsSync(join(databaseDir, 'PG_VERSION'))) {
    log('no cluster found, running initdb …')
    await instance.initialise()
  }
  await instance.start()
  await ensureDatabase(instance)
  log(`postgres ${DB.port} is up. Ctrl+C to stop.`)

  const shutdown = async () => {
    log('stopping …')
    await instance.stop('fast')
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

async function stop() {
  if (!(await portIsOpen())) {
    log('no server running')
    return
  }
  await runTool('pg_ctl', ['-D', databaseDir, '-m', 'fast', 'stop'])
  log('stopped')
}

async function status() {
  log((await portIsOpen()) ? `running on port ${DB.port}` : 'not running')
}

const command = process.argv[2] ?? 'status'
const actions = { init: initialise, start, stop, status }

if (!actions[command]) {
  console.error(`Unknown command "${command}". Use: init | start | stop | status`)
  process.exit(1)
}

try {
  await actions[command]()
} catch (error) {
  console.error(`[db] ${error.message}`)
  process.exit(1)
}
