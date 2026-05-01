export function uniqueEmail(prefix: string): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 7)
  return `${prefix}.${t}.${r}@e2e.example.com`
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}`
}
