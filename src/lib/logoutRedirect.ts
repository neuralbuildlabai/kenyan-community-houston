/** Where to send the browser after sign-out, based on the current route. */
export function postLogoutPath(pathname: string): string {
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    return '/admin/login'
  }
  return '/'
}
