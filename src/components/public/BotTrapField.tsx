import { BOT_TRAP_FIELD } from '@/lib/formBotGuard'

/**
 * Hidden honeypot input; pair with `useFormBotGuard`. Kept off-screen rather
 * than `display: none` because some bots skip fields that are display-none.
 */
export function BotTrapField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={`kigh-${BOT_TRAP_FIELD}`}>Company website</label>
      <input
        id={`kigh-${BOT_TRAP_FIELD}`}
        name={BOT_TRAP_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
