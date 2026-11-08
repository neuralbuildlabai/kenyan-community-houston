import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isChunkLoadError, reloadForStaleChunk } from '@/lib/chunkRecovery'

type Props = {
  children: ReactNode
  /** Clears a shown error when it changes, e.g. the route path. */
  resetKey?: string
  /** Full-screen fallback for the app root; inline for a page area. */
  fullScreen?: boolean
}

type State = { error: Error | null }

/**
 * Keeps one failed page from blanking the whole app. A stale-build chunk
 * error reloads once (see chunkRecovery); anything else shows a retry.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error) && reloadForStaleChunk()) return
    console.error('[app] render error', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const stale = isChunkLoadError(error)
    return (
      <div
        role="alert"
        data-testid="error-boundary"
        className={
          this.props.fullScreen
            ? 'flex min-h-screen items-center justify-center p-6'
            : 'flex min-h-[50vh] items-center justify-center p-6'
        }
      >
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold text-foreground">
            {stale ? 'This page needs a refresh' : 'Something went wrong'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {stale
              ? 'The site was updated while this page was open, or the connection dropped.'
              : 'This part of the page could not load. Your other pages still work.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {stale ? null : (
              <Button variant="outline" onClick={() => this.setState({ error: null })}>
                Try again
              </Button>
            )}
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      </div>
    )
  }
}
