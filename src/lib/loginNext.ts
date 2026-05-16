/** Build `/login?next=…` for returning users to the page they came from. */

export function buildLoginNextUrl(pathname: string, search = '', hash = ''): string {
  const dest = `${pathname}${search}${hash}`
  return `/login?next=${encodeURIComponent(dest)}`
}

export function loginNextFromLocation(location: {
  pathname: string
  search: string
  hash: string
}, options?: { hash?: string }): string {
  const hash = options?.hash ?? location.hash
  return buildLoginNextUrl(location.pathname, location.search, hash)
}
