/** Sentinel select value: the uploader is defining a new album instead of picking one. */
export const GALLERY_NEW_ALBUM_ID = '__new_album__'

export const GALLERY_ALBUM_NAME_MIN = 2
export const GALLERY_ALBUM_NAME_MAX = 80
export const GALLERY_ALBUM_DESCRIPTION_MAX = 500

export type GalleryAlbumOption = {
  id: string
  name: string
  slug: string
}

export type CreatedGalleryAlbum = GalleryAlbumOption

export function galleryAlbumSlugBase(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'album'
}

export function uniqueGalleryAlbumSlug(name: string, existingSlugs: Iterable<string>): string {
  const taken = new Set(existingSlugs)
  const base = galleryAlbumSlugBase(name)
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export function galleryAlbumNameError(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length < GALLERY_ALBUM_NAME_MIN) {
    return 'Enter an album name (at least 2 characters).'
  }
  if (trimmed.length > GALLERY_ALBUM_NAME_MAX) {
    return 'Album name must be 80 characters or fewer.'
  }
  return null
}

export function galleryAlbumDescriptionError(description: string): string | null {
  if (description.trim().length > GALLERY_ALBUM_DESCRIPTION_MAX) {
    return 'Album description must be 500 characters or fewer.'
  }
  return null
}

export function createdGalleryAlbumFromRpc(data: unknown): CreatedGalleryAlbum | null {
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return null
  const rec = row as Record<string, unknown>
  if (typeof rec.id !== 'string' || !rec.id) return null
  if (typeof rec.name !== 'string' || typeof rec.slug !== 'string') return null
  return { id: rec.id, name: rec.name, slug: rec.slug }
}

export function galleryAlbumOptionsFromRpc(data: unknown): GalleryAlbumOption[] {
  if (!Array.isArray(data)) return []
  const options: GalleryAlbumOption[] = []
  for (const row of data) {
    const parsed = createdGalleryAlbumFromRpc(row)
    if (parsed) options.push(parsed)
  }
  return options
}

/** Open public albums first, then albums this member created that are not in that list. */
export function mergeGalleryAlbumOptions(
  openAlbums: GalleryAlbumOption[],
  mine: GalleryAlbumOption[],
): GalleryAlbumOption[] {
  const byId = new Map<string, GalleryAlbumOption>()
  for (const album of openAlbums) byId.set(album.id, album)
  for (const album of mine) {
    if (!byId.has(album.id)) byId.set(album.id, album)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}
