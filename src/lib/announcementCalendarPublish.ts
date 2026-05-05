import type { SupabaseClient } from '@/lib/supabase'
import { canonicalCategory } from '@/lib/communityCategories'
import { weeklyOccurrenceDates, RECURRENCE_DEFAULT_MONTHS_HORIZON } from '@/lib/calendarWeeklyOccurrences'
import { generateSlug } from '@/lib/utils'
import { isoNow, pendingQueuePublishPayload } from '@/lib/publishLifecycle'
import { format, startOfDay } from 'date-fns'
import type { Event } from '@/lib/types'

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
  calendar_is_recurring?: boolean | null
  calendar_recurrence_frequency?: string | null
  calendar_recurrence_until?: string | null
  calendar_recurrence_count?: number | null
}

export function eventCategoryFromAnnouncement(category: string): string {
  return canonicalCategory(category)
}

/** Minimum fields to publish a calendar row alongside an announcement. */
export function calendarIntentIsComplete(
  a: Pick<AnnouncementCalendarRow, 'include_in_calendar' | 'calendar_start_date' | 'calendar_location'>
): boolean {
  return !!(a.include_in_calendar && a.calendar_start_date && a.calendar_location?.trim())
}

function isWeeklyRecurringIntent(a: AnnouncementCalendarRow): boolean {
  if (!a.include_in_calendar || !a.calendar_is_recurring) return false
  const f = (a.calendar_recurrence_frequency ?? 'weekly').toLowerCase()
  return f === 'weekly' || f === ''
}

/** Product currently ships weekly recurrence only (announcement + calendar path). */
function recurrenceUnsupportedError(a: AnnouncementCalendarRow): Error | null {
  if (!a.calendar_is_recurring) return null
  const f = (a.calendar_recurrence_frequency ?? 'weekly').toLowerCase()
  if (f === 'weekly' || f === '') return null
  return new Error('Only weekly recurrence is supported for announcement calendar events in this release.')
}

function todayYmdLocal(): string {
  return format(startOfDay(new Date()), 'yyyy-MM-dd')
}

async function ensureUniqueEventSlug(supabase: SupabaseClient, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug
  const { data: clash } = await supabase.from('events').select('id').eq('slug', slug).maybeSingle()
  if (clash?.id && clash.id !== excludeId) slug = `${baseSlug}-${Date.now().toString(36)}`
  return slug
}

/** Sync recurrence_master_id: earliest row is canonical (null master); others point to it. */
async function applyRecurrenceMasterPointers(
  supabase: SupabaseClient,
  recurrenceGroupId: string
): Promise<void> {
  const { data: rows } = await supabase
    .from('events')
    .select('id')
    .eq('recurrence_group_id', recurrenceGroupId)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })

  const ids = (rows ?? []).map((r) => r.id as string)
  if (ids.length === 0) return
  const masterId = ids[0]
  for (const id of ids) {
    await supabase
      .from('events')
      .update({ recurrence_master_id: id === masterId ? null : masterId })
      .eq('id', id)
  }
}

async function upsertWeeklyRecurringPublishedEventsForAnnouncement(
  supabase: SupabaseClient,
  a: AnnouncementCalendarRow
): Promise<{ error: Error | null; eventId: string | null }> {
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

  const until =
    a.calendar_recurrence_until?.trim() ||
    (a.calendar_end_date?.trim() ? a.calendar_end_date.trim() : null)

  const dates = weeklyOccurrenceDates(a.calendar_start_date!, until || null, RECURRENCE_DEFAULT_MONTHS_HORIZON)

  if (dates.length === 0) {
    return {
      error: new Error(
        'Weekly recurrence produced no occurrences in the allowed window. Adjust the start date or optional end date.'
      ),
      eventId: null,
    }
  }

  const { data: existingRows } = await supabase.from('events').select('*').eq('source_announcement_id', a.id)

  let existing = (existingRows ?? []) as Event[]
  const recurrenceGroupId =
    existing.find((e) => e.recurrence_group_id)?.recurrence_group_id ?? crypto.randomUUID()

  const todayStr = todayYmdLocal()
  const desired = new Set(dates)

  const toDelete = existing.filter((e) => e.start_date >= todayStr && !desired.has(e.start_date))
  for (const row of toDelete) {
    const { error } = await supabase.from('events').delete().eq('id', row.id)
    if (error) return { error: new Error(error.message), eventId: null }
  }

  const { data: freshRows } = await supabase.from('events').select('*').eq('source_announcement_id', a.id)
  existing = (freshRows ?? []) as Event[]

  const sortedDates = [...dates].sort((x, y) => x.localeCompare(y))
  const lastOccurrenceDate = sortedDates[sortedDates.length - 1]

  const baseSlug = generateSlug(a.title)

  for (let i = 0; i < sortedDates.length; i++) {
    const start_date = sortedDates[i]
    const match = existing.find((e) => e.start_date === start_date)
    const slugBase = `${baseSlug}-${start_date}`
    let slug = slugBase
    if (!match) {
      slug = await ensureUniqueEventSlug(supabase, slugBase)
    } else if (match.slug) {
      slug = match.slug
    }

    const payload = {
      title: a.title,
      slug,
      category,
      description,
      short_description: a.summary?.trim() || null,
      start_date,
      end_date: null as string | null,
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
      ticket_price: null as number | null,
      ticket_url: null as string | null,
      organizer_name: a.author_name?.trim() || null,
      organizer_email: null as string | null,
      organizer_contact: null as string | null,
      organizer_website: null as string | null,
      tags: [] as string[],
      status: 'published' as const,
      published_at: now,
      updated_at: now,
      is_featured: false,
      is_recurring: true,
      recurrence_group_id: recurrenceGroupId,
      recurrence_frequency: 'weekly',
      recurrence_interval: 1,
      recurrence_until: lastOccurrenceDate,
      recurrence_position: i + 1,
      source_announcement_id: a.id,
    }

    if (match) {
      const { error } = await supabase
        .from('events')
        .update({
          ...payload,
          published_at: match.published_at ?? now,
        })
        .eq('id', match.id)
      if (error) return { error: new Error(error.message), eventId: null }
    } else {
      const { error } = await supabase.from('events').insert([payload])
      if (error) return { error: new Error(error.message), eventId: null }
    }
  }

  await applyRecurrenceMasterPointers(supabase, recurrenceGroupId)

  const { data: ordered } = await supabase
    .from('events')
    .select('id')
    .eq('source_announcement_id', a.id)
    .order('start_date', { ascending: true })

  const masterId = ordered?.[0]?.id ?? null
  return { error: null, eventId: masterId }
}

async function upsertSinglePublishedEventForAnnouncement(
  supabase: SupabaseClient,
  a: AnnouncementCalendarRow
): Promise<{ error: Error | null; eventId: string | null }> {
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

  const meta = {
    is_recurring: false,
    recurrence_group_id: null as string | null,
    recurrence_master_id: null as string | null,
    recurrence_frequency: null as string | null,
    recurrence_interval: 1,
    recurrence_until: null as string | null,
    source_announcement_id: a.id,
    recurrence_position: null as number | null,
  }

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
        ...meta,
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
    ...meta,
  }

  const { data: inserted, error: insErr } = await supabase.from('events').insert([insertPayload]).select('id').single()

  if (insErr) return { error: new Error(insErr.message), eventId: null }
  return { error: null, eventId: inserted?.id ?? null }
}

/**
 * Creates or updates published event(s) from an announcement.
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

  const unsupported = recurrenceUnsupportedError(a)
  if (unsupported) return { error: unsupported, eventId: null }

  if (isWeeklyRecurringIntent(a)) {
    if (a.linked_event_id) {
      const { data: linkedRow } = await supabase
        .from('events')
        .select('is_recurring')
        .eq('id', a.linked_event_id)
        .maybeSingle()
      if (linkedRow && linkedRow.is_recurring === false) {
        await supabase.from('events').delete().eq('id', a.linked_event_id)
      }
    }
    return upsertWeeklyRecurringPublishedEventsForAnnouncement(supabase, a)
  }

  const { data: bySource } = await supabase.from('events').select('id, is_recurring').eq('source_announcement_id', a.id)

  if ((bySource?.length ?? 0) > 1) {
    await supabase.from('events').delete().eq('source_announcement_id', a.id)
    return upsertSinglePublishedEventForAnnouncement(supabase, { ...a, linked_event_id: null })
  }

  if (bySource?.length === 1 && bySource[0]!.is_recurring === true) {
    await supabase.from('events').delete().eq('source_announcement_id', a.id)
    return upsertSinglePublishedEventForAnnouncement(supabase, { ...a, linked_event_id: null })
  }

  return upsertSinglePublishedEventForAnnouncement(supabase, a)
}

/**
 * Publish a pending announcement (Submissions queue or admin publish).
 * When include_in_calendar + complete fields → upsert published event(s) and link.
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
