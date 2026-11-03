/** One compact line per request, with duration and authenticated actor. */
export function requestLog(request, response, next) {
  const started = performance.now()
  response.on('finish', () => {
    const ms = Math.round(performance.now() - started)
    const who = request.admin ? ` as ${request.admin.email}` : ''
    const line = `${request.method} ${request.originalUrl} → ${response.statusCode} (${ms}ms)${who}`
    if (response.statusCode >= 500) console.error(line)
    else if (request.originalUrl.startsWith('/api')) console.log(line)
  })
  next()
}
