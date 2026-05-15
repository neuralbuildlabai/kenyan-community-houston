/** Public site URL for invite links; never log secrets here. */
export const PUBLIC_SITE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL?.trim()) ||
  'https://kenyancommunityhouston.org'

export const GENERAL_LOCATION_AREA_VALUES = [
  'houston',
  'league_city',
  'pasadena',
  'pearland',
  'sugar_land',
  'conroe',
  'greater_katy',
  'the_woodlands',
  'cypress',
  'baytown',
  'deer_park',
  'friendswood',
  'galveston',
  'lake_jackson',
  'la_porte',
  'missouri_city',
  'rosenberg',
  'texas_city',
  'atascocita',
  'channelview',
  'mission_bend',
  'spring',
  'alvin',
  'angleton',
  'bellaire',
  'clute',
  'dickinson',
  'fulshear',
  'humble',
  'katy',
  'la_marque',
  'richmond',
  'santa_fe',
  'seabrook',
  'south_houston',
  'stafford',
  'tomball',
  'webster',
  'west_university_place',
  'aldine',
  'cinco_ranch',
  'fresno',
  'greatwood',
  'new_territory',
  'pecan_grove',
  'sienna',
  'jersey_village',
  'kemah',
  'magnolia',
  'manvel',
  'mont_belvieu',
  'montgomery',
  'prairie_view',
  'sealy',
  'shenandoah',
  'waller',
  'willis',
  'other_houston_metro',
  'outside_houston_metro',
] as const

export type GeneralLocationArea = (typeof GENERAL_LOCATION_AREA_VALUES)[number]

export const GENERAL_LOCATION_AREA_LABEL: Record<GeneralLocationArea, string> = {
  houston: 'Houston',
  league_city: 'League City',
  pasadena: 'Pasadena',
  pearland: 'Pearland',
  sugar_land: 'Sugar Land',
  conroe: 'Conroe',
  greater_katy: 'Greater Katy',
  the_woodlands: 'The Woodlands',
  cypress: 'Cypress',
  baytown: 'Baytown',
  deer_park: 'Deer Park',
  friendswood: 'Friendswood',
  galveston: 'Galveston',
  lake_jackson: 'Lake Jackson',
  la_porte: 'La Porte',
  missouri_city: 'Missouri City',
  rosenberg: 'Rosenberg',
  texas_city: 'Texas City',
  atascocita: 'Atascocita',
  channelview: 'Channelview',
  mission_bend: 'Mission Bend',
  spring: 'Spring',
  alvin: 'Alvin',
  angleton: 'Angleton',
  bellaire: 'Bellaire',
  clute: 'Clute',
  dickinson: 'Dickinson',
  fulshear: 'Fulshear',
  humble: 'Humble',
  katy: 'Katy',
  la_marque: 'La Marque',
  richmond: 'Richmond',
  santa_fe: 'Santa Fe',
  seabrook: 'Seabrook',
  south_houston: 'South Houston',
  stafford: 'Stafford',
  tomball: 'Tomball',
  webster: 'Webster',
  west_university_place: 'West University Place',
  aldine: 'Aldine',
  cinco_ranch: 'Cinco Ranch',
  fresno: 'Fresno',
  greatwood: 'Greatwood',
  new_territory: 'New Territory',
  pecan_grove: 'Pecan Grove',
  sienna: 'Sienna',
  jersey_village: 'Jersey Village',
  kemah: 'Kemah',
  magnolia: 'Magnolia',
  manvel: 'Manvel',
  mont_belvieu: 'Mont Belvieu',
  montgomery: 'Montgomery',
  prairie_view: 'Prairie View',
  sealy: 'Sealy',
  shenandoah: 'Shenandoah',
  waller: 'Waller',
  willis: 'Willis',
  other_houston_metro: 'Other Houston Metro Area',
  outside_houston_metro: 'Outside Houston Metro',
}

export function generalLocationLabel(v: string | null | undefined): string {
  if (!v) return '—'
  return GENERAL_LOCATION_AREA_LABEL[v as GeneralLocationArea] ?? v
}

export const PROFESSIONAL_FIELD_VALUES = [
  'healthcare',
  'nursing',
  'education',
  'information_technology',
  'engineering',
  'finance_accounting',
  'legal',
  'real_estate',
  'construction_trades',
  'transportation_logistics',
  'beauty_wellness',
  'hospitality_food',
  'business_owner',
  'entrepreneurship',
  'government_public_service',
  'nonprofit_community',
  'student',
  'retired',
  'homemaker_caregiver',
  'other',
] as const

export type ProfessionalField = (typeof PROFESSIONAL_FIELD_VALUES)[number]

export const PROFESSIONAL_FIELD_LABEL: Record<ProfessionalField, string> = {
  healthcare: 'Healthcare',
  nursing: 'Nursing',
  education: 'Education',
  information_technology: 'Information Technology',
  engineering: 'Engineering',
  finance_accounting: 'Finance / Accounting',
  legal: 'Legal',
  real_estate: 'Real Estate',
  construction_trades: 'Construction / Trades',
  transportation_logistics: 'Transportation / Logistics',
  beauty_wellness: 'Beauty / Wellness',
  hospitality_food: 'Hospitality / Food',
  business_owner: 'Business Owner',
  entrepreneurship: 'Entrepreneurship',
  government_public_service: 'Government / Public Service',
  nonprofit_community: 'Nonprofit / Community Work',
  student: 'Student',
  retired: 'Retired',
  homemaker_caregiver: 'Homemaker / Caregiver',
  other: 'Other',
}

export function professionalFieldLabel(v: string | null | undefined): string {
  if (!v) return '—'
  return PROFESSIONAL_FIELD_LABEL[v as ProfessionalField] ?? v
}

/** Strip non-digits for WhatsApp wa.me links. Returns empty string if nothing left. */
export function normalizeWhatsAppPhone(raw: string): string {
  return (raw || '').replace(/[^\d]/g, '')
}

export function isValidWhatsAppNormalizedDigits(digits: string): boolean {
  return digits.length >= 7 && digits.length <= 15
}

export function buildInviteMessage(args: {
  recipientName?: string | null
  personalNote?: string | null
  siteUrl?: string
}): string {
  const site = (args.siteUrl ?? PUBLIC_SITE_URL).trim()
  const name = args.recipientName?.trim()
  const note = args.personalNote?.trim()

  let body: string
  if (name) {
    body = `Hi ${name}, I'm inviting you to join Kenyan Community Houston.\n\nYou can use the community website to view events, announcements, resources, businesses, community support updates, and membership information.\n\nVisit: ${site}`
  } else {
    body = `Hi, I'm inviting you to join Kenyan Community Houston.\n\nYou can use the community website to view events, announcements, resources, businesses, community support updates, and membership information.\n\nVisit: ${site}`
  }
  if (note) {
    body += `\n\nNote from me: ${note}`
  }
  return body
}

export function buildWhatsAppInviteUrl(normalizedDigits: string, message: string): string {
  const enc = encodeURIComponent(message)
  return `https://wa.me/${normalizedDigits}?text=${enc}`
}

export function isAllowedGeneralLocationArea(v: string): v is GeneralLocationArea {
  return (GENERAL_LOCATION_AREA_VALUES as readonly string[]).includes(v)
}

export function isAllowedProfessionalField(v: string): v is ProfessionalField {
  return (PROFESSIONAL_FIELD_VALUES as readonly string[]).includes(v)
}
