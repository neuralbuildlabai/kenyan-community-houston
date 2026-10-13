/**
 * Read-only backup of every Supabase Storage bucket to a local folder.
 *
 * The database dump (pg_dump) holds storage *metadata* but not the files —
 * gallery photos, flyers, signatures and the rest live here. This copies
 * each object to disk and writes a manifest with sizes and SHA-256 hashes so
 * the copy can be checked later.
 *
 * It never writes, moves or deletes anything in Supabase.
 *
 * Usage:
 *   PROD_SUPABASE_URL=https://<ref>.supabase.co \
 *   PROD_SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/backup-storage.mjs [output-dir]
 *
 * Output defaults to backups/storage-<ref>-<Houston timestamp>/. Re-running
 * with the same output dir resumes: files already on disk at the right size
 * are skipped.
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const URL = process.env.PROD_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY
const PAGE_SIZE = 1000
const CONCURRENCY = 4
const MAX_RETRIES = 4

if (!URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required env vars:')
  console.error('PROD_SUPABASE_URL')
  console.error('PROD_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const projectRef = new globalThis.URL(URL).hostname.split('.')[0]

/** 2026-10-12_2045 in Houston time, so folder names match the calendar admins use. */
function houstonStamp(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}_${parts.hour}${parts.minute}`
}

const outDir = resolve(process.argv[2] ?? join('backups', `storage-${projectRef}-${houstonStamp()}`))

const supabase = createClient(URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Every object path in a bucket, following folders and paging past 1000. */
async function listFilesRecursive(bucket, prefix = '') {
  const files = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`Failed to list ${bucket}/${prefix}: ${error.message}`)

    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      // Folders come back without an id.
      if (!item.id) files.push(...(await listFilesRecursive(bucket, path)))
      else files.push({ path, size: item.metadata?.size ?? null })
    }
    if (!data || data.length < PAGE_SIZE) break
  }
  return files
}

async function downloadWithRetry(bucket, path) {
  let lastError
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { data, error } = await supabase.storage.from(bucket).download(path)
    if (!error && data) return Buffer.from(await data.arrayBuffer())
    lastError = error
    await sleep(attempt * 1500)
  }
  throw new Error(lastError?.message ?? 'download failed')
}

async function sizeOnDisk(file) {
  try {
    return (await stat(file)).size
  } catch {
    return null
  }
}

async function runPool(items, worker) {
  let next = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) await worker(items[next++])
    })
  )
}

async function main() {
  console.log(`Backing up storage for project ${projectRef}`)
  console.log(`Output: ${outDir}\n`)
  await mkdir(outDir, { recursive: true })

  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`Failed to list buckets: ${error.message}`)

  const manifest = {
    project: projectRef,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    buckets: [],
  }
  let failures = 0

  for (const bucket of buckets) {
    const files = await listFilesRecursive(bucket.name)
    console.log(`${bucket.name}: ${files.length} files (${bucket.public ? 'public' : 'private'})`)
    const entry = { name: bucket.name, public: bucket.public, files: [], failed: [] }
    manifest.buckets.push(entry)

    let done = 0
    await runPool(files, async ({ path, size }) => {
      const target = join(outDir, bucket.name, path)
      try {
        let bytes
        const existing = await sizeOnDisk(target)
        if (existing !== null && size !== null && existing === size) {
          bytes = await readFile(target)
        } else {
          bytes = await downloadWithRetry(bucket.name, path)
          await mkdir(dirname(target), { recursive: true })
          await writeFile(target, bytes)
        }
        entry.files.push({
          path,
          size: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        })
      } catch (err) {
        failures++
        entry.failed.push({ path, error: err instanceof Error ? err.message : String(err) })
        console.error(`  FAILED ${bucket.name}/${path}: ${err instanceof Error ? err.message : err}`)
      }
      done++
      if (done % 50 === 0 || done === files.length) {
        process.stdout.write(`  ${done}/${files.length}\r`)
      }
    })
    entry.files.sort((a, b) => a.path.localeCompare(b.path))
    process.stdout.write('\n')
  }

  manifest.finishedAt = new Date().toISOString()
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  const total = manifest.buckets.reduce((n, b) => n + b.files.length, 0)
  const bytes = manifest.buckets.reduce((n, b) => n + b.files.reduce((m, f) => m + f.size, 0), 0)
  console.log(`\nSaved ${total} files (${(bytes / 1024 / 1024).toFixed(1)} MB) to ${outDir}`)
  if (failures) {
    console.error(`${failures} files failed — re-run with the same output dir to retry them:`)
    console.error(`  node scripts/backup-storage.mjs "${outDir}"`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
