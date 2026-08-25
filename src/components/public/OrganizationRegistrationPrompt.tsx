import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ORGANIZATION_REGISTER_COPY,
  ORG_REGISTRATION_STATUS_OPTIONS,
  organizationDirectoryPath,
  searchRegisteredOrganizations,
  type DirectoryMatch,
  type OrgRegistrationStatus,
  type ParticipationTypeId,
} from '@/lib/eventParticipation'

type Props = {
  participationType: ParticipationTypeId
  registerHref: string
  status: OrgRegistrationStatus | ''
  onStatusChange: (status: OrgRegistrationStatus) => void
  organizationName: string
  onOrganizationNameChange: (name: string) => void
  showLookup: boolean
  showRegisterPrompt: boolean
}

export function OrganizationRegistrationPrompt({
  participationType,
  registerHref,
  status,
  onStatusChange,
  organizationName,
  onOrganizationNameChange,
  showLookup,
  showRegisterPrompt,
}: Props) {
  const [query, setQuery] = useState(organizationName)
  const [results, setResults] = useState<DirectoryMatch[]>([])
  const [searching, setSearching] = useState(false)
  const directoryHref = organizationDirectoryPath(participationType)

  useEffect(() => {
    setQuery(organizationName)
  }, [organizationName])

  useEffect(() => {
    if (!showLookup) {
      setResults([])
      return
    }
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      setSearching(true)
      void searchRegisteredOrganizations(q).then((rows) => {
        if (!cancelled) {
          setResults(rows)
          setSearching(false)
        }
      })
    }, 280)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [query, showLookup])

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
      <div className="form-field-stack">
        <Label htmlFor="org-registered">Is your business or organization already registered with KIGH?</Label>
        <Select
          value={status || undefined}
          onValueChange={(v) => onStatusChange(v as OrgRegistrationStatus)}
        >
          <SelectTrigger id="org-registered" data-testid="org-registration-status">
            <SelectValue placeholder="Select one" />
          </SelectTrigger>
          <SelectContent>
            {ORG_REGISTRATION_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showLookup ? (
        <div className="form-field-stack">
          <Label htmlFor="org-lookup">Business or organization name</Label>
          <Input
            id="org-lookup"
            data-testid="org-lookup"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              onOrganizationNameChange(e.target.value)
            }}
            placeholder="Search the KIGH directory…"
            autoComplete="organization"
          />
          {searching ? (
            <p className="text-xs text-muted-foreground">Searching the directory…</p>
          ) : null}
          {results.length > 0 ? (
            <ul className="divide-y rounded-lg border bg-background text-sm">
              {results.map((row) => (
                <li key={`${row.kind}-${row.id}`}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted/60"
                    onClick={() => {
                      setQuery(row.name)
                      onOrganizationNameChange(row.name)
                      setResults([])
                    }}
                  >
                    <span className="font-medium text-foreground">{row.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.kind === 'business' ? 'Business directory' : 'Community groups'}
                      {row.category ? ` · ${row.category}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {status === 'not_sure' ? (
            <p className="text-xs text-muted-foreground">
              Not seeing it?{' '}
              <Link to={directoryHref} className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                Browse the directory
              </Link>
              {directoryHref === '/businesses' ? (
                <>
                  {' '}
                  or{' '}
                  <Link
                    to="/community-groups"
                    className="text-primary underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    community groups
                  </Link>
                </>
              ) : (
                <>
                  {' '}
                  or{' '}
                  <Link
                    to="/businesses"
                    className="text-primary underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    business directory
                  </Link>
                </>
              )}
              .
            </p>
          ) : null}
        </div>
      ) : null}

      {showRegisterPrompt ? (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-background/80 p-3.5">
          <p className="text-sm text-foreground/85 leading-relaxed">{ORGANIZATION_REGISTER_COPY}</p>
          <Button asChild>
            <Link to={registerHref} data-testid="register-org-button">
              Register business or organization
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
