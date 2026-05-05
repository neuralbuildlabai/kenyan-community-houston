import type { SupabaseClient } from '@/lib/supabase'
import { generateSlug } from '@/lib/utils'
import { isoNow, pendingQueuePublishPayload } from '@/lib/publishLifecycle'

/** Announcement row fields used when publishing an optional calendar event. */
export type AnnouncementCalendarRow = {
  id: string
  title: string
  slug: string
  summary: string | null
  body: string | null
  category: string
  author_name: string | null
  image_url: string | null
  external_url: string | null
  include_in_calendar: boolean | null
  linked_event_id: string | null
  calendar_start_date: string | null
  calendar_end_date: string | null
  calendar_start_time: string | null
  calendar_end_time: string | null
  calendar_location: string | null
  calendar_address: string | null
  calendar_flyer_url: string | null
  calendar_registration_url: string | null
}

export function eventCategoryFromAnnouncement(category: string): string {
  const map: Record<string, string> = {
    Religious: 'Religious',
    Sports: 'Sports',
    'Youth & Education': 'Youth',
    'Events Notice': 'Community Meeting',
    'Community News': 'Community Meeting',
    'Government & Civic': 'Community Meeting',
    'Health & Safety': 'Health & Wellness',
    Memorial: 'Community',
    Celebration: 'Community',
    Other: 'Community',
  }
  return map[category] ?? 'Community'
}

/** Minimum fields to publish a calendar row alongside an announcement. */
export function calendarIntentIsComplete(
  a: Pick<AnnouncementCalendarRow, 'include_in_calendar' | 'calendar_start_date' | 'calendar_location'>
): boolean {
  return !!(a.include_in_calendar && a.calendar_start_date && a.calendar_location?.trim())
}

/**
 * Creates or updates a published event from an announcement.
 * Call only when calendarIntentIsComplete(a) is true.
 */
export async function upsertPublishedEventForAnnouncement(
  supabase: SupabaseClient,
  a: AnnouncementCalendarRow
): Promise<{ error: Error | null; eventId: string | null }> {
  if (!calendarIntentIsComplete(a)) {
    return {
      error: new Error('Calendar start date and location are required for calendar announcements.'),
      eventId: null,
    }
  }

  const now = isoNow()
  const description = (a.body?.trim() || a.summary?.trim() || a.title).slice(0, 20000)
  const flyer =
    (a.calendar_flyer_url?.trim() || '') ||
    (a.image_url?.trim() || '') ||
    null
  const registration =
    (a.calendar_registration_url?.trim() || '') ||
    (a.external_url?.trim() || '') ||
    null

  const category = eventCategoryFromAnnouncement(a.category)
  const loc = a.calendar_location!.trim()

  if (a.linked_event_id) {
    const { error } = await supabase
      .from('events')
      .update({
        title: a.title,
        description,
        short_description: a.summary?.trim() || null,
        category,
        start_date: a.calendar_start_date,
        end_date: a.calendar_end_date?.trim() || null,
        start_time: a.calendar_start_time?.trim() || null,
        end_time: a.calendar_end_time?.trim() || null,
        location: loc,
        address: a.calendar_address?.trim() || null,
        flyer_url: flyer,
        image_url: a.image_url?.trim() || null,
        registration_url: registration || null,
        status: 'published',
        published_at: now,
        updated_at: now,
        is_featured: false,
      })
      .eq('id', a.linked_event_id)

    if (error) return { error: new Error(error.message), eventId: null }
    return { error: null, eventId: a.linked_event_id }
  }

  let slug = generateSlug(a.title)
  const { data: clash } = await supabase.from('events').select('id').eq('slug', slug).maybeSingle()
  if (clash?.id) slug = `${slug}-${Date.now().toString(36)}`

  const insertPayload = {
    title: a.title,
    slug,
    category,
    description,
    short_description: a.summary?.trim() || null,
    start_date: a.calendar_start_date,
    end_date: a.calendar_end_date?.trim() || null,
    start_time: a.calendar_start_time?.trim() || null,
    end_time: a.calendar_end_time?.trim() || null,
    location: loc,
    address: a.calendar_address?.trim() || null,
    timezone: 'America/Chicago',
    is_virtual: false,
    virtual_url: null,
    registration_url: registration || null,
    flyer_url: flyer,
    image_url: a.image_url?.trim() || null,
    is_free: true,
    ticket_price: null,
    ticket_url: null,
    organizer_name: a.author_name?.trim() || null,
    organizer_email: null,
    organizer_contact: null,
    organizer_website: null,
    tags: [] as string[],
    status: 'published',
    published_at: now,
    is_featured: false,
  }

  const { data: inserted, error: insErr } = await supabase.from('events').insert([insertPayload]).select('id').single()

  if (insErr) return { error: new Error(insErr.message), eventId: null }
  return { error: null, eventId: inserted?.id ?? null }
}

/**
 * Publish a pending announcement (Submissions queue or admin publish).
 * When include_in_calendar + complete fields → upsert published event and link.
 */
export async function publishAnnouncementRow(
  supabase: SupabaseClient,
  row: AnnouncementCalendarRow & { status: string }
): Promise<{ ok: boolean; errorMessage?: string }> {
  const pub = pendingQueuePublishPayload()
  let linkedId: string | null = row.linked_event_id ?? null

  if (row.include_in_calendar) {
    if (!calendarIntentIsComplete(row)) {
      return {
        ok: false,
        errorMessage:
          'This announcement is marked for the calendar but is missing a start date or location. Edit it under Admin → Announcements, fill calendar fields, then approve again.',
      }
    }
    const { error, eventId } = await upsertPublishedEventForAnnouncement(supabase, row)
    if (error) return { ok: false, errorMessage: error.message }
    linkedId = eventId
  }

  const { data, error } = await supabase
    .from('announcements')
    .update({
      ...pub,
      linked_event_id: linkedId,
    })
    .eq('id', row.id)
    .select('id')

  if (error) return { ok: false, errorMessage: error.message }
  if (!data?.length) return { ok: false, errorMessage: 'Announcement update did not apply (permissions?).' }
  return { ok: true }
}
