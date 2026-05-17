import { jsonResponse } from './cors.ts'

export type ApiErrorBody = {
  ok: false
  code: string
  message: string
  details?: string
}

export function errorJson(
  req: Request,
  status: number,
  code: string,
  message: string,
  details?: string
): Response {
  const body: ApiErrorBody = { ok: false, code, message }
  if (details) body.details = details
  return jsonResponse(req, status, body)
}
