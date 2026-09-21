import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'sonner'

import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { PageLoader } from '@/components/LoadingSpinner'

import { PublicLayout } from '@/components/layout/PublicLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'

import { HomePage } from '@/pages/public/HomePage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'

import { SYSTEM_HEALTH_ADMIN_ROLES } from '@/lib/platformAdmin'

import { RequireAuth } from '@/components/RequireAuth'
import { RequiresFreshPassword } from '@/components/RequiresFreshPassword'
import { PasswordExpiryRouteGate } from '@/components/PasswordExpiryRouteGate'
import { LoginPage } from '@/pages/auth/LoginPage'

// Route components load on demand: this keeps the 29 admin pages — and the
// PDF libraries only the certificate pages use — out of the bundle a first-time
// visitor downloads.
const AboutPage = lazy(() => import('@/pages/public/AboutPage').then((m) => ({ default: m.AboutPage })))
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })))
const AdminAnnouncementsPage = lazy(() => import('@/pages/admin/AnnouncementsPage').then((m) => ({ default: m.AdminAnnouncementsPage })))
const AdminBusinessesPage = lazy(() => import('@/pages/admin/BusinessesPage').then((m) => ({ default: m.AdminBusinessesPage })))
const AdminCalendarPage = lazy(() => import('@/pages/admin/CalendarPage').then((m) => ({ default: m.AdminCalendarPage })))
const AdminCertificatesPage = lazy(() => import('@/pages/admin/AdminCertificatesPage').then((m) => ({ default: m.AdminCertificatesPage })))
const AdminChangePasswordPage = lazy(() => import('@/pages/admin/AdminChangePasswordPage').then((m) => ({ default: m.AdminChangePasswordPage })))
const AdminChatPage = lazy(() => import('@/pages/admin/AdminChatPage').then((m) => ({ default: m.AdminChatPage })))
const AdminCommunityGroupsPage = lazy(() => import('@/pages/admin/AdminCommunityGroupsPage').then((m) => ({ default: m.AdminCommunityGroupsPage })))
const AdminContactsPage = lazy(() => import('@/pages/admin/ContactsPage').then((m) => ({ default: m.AdminContactsPage })))
const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const AdminEventCommentsPage = lazy(() => import('@/pages/admin/AdminEventCommentsPage').then((m) => ({ default: m.AdminEventCommentsPage })))
const AdminFeedPage = lazy(() => import('@/pages/admin/AdminFeedPage').then((m) => ({ default: m.AdminFeedPage })))
const AdminFundraisersPage = lazy(() => import('@/pages/admin/FundraisersPage').then((m) => ({ default: m.AdminFundraisersPage })))
const AdminGalleryPage = lazy(() => import('@/pages/admin/GalleryPage').then((m) => ({ default: m.AdminGalleryPage })))
const AdminInvitesPage = lazy(() => import('@/pages/admin/AdminInvitesPage').then((m) => ({ default: m.AdminInvitesPage })))
const AdminLeadershipPage = lazy(() => import('@/pages/admin/AdminLeadershipPage').then((m) => ({ default: m.AdminLeadershipPage })))
const AdminMediaSubmissionsPage = lazy(() => import('@/pages/admin/AdminMediaSubmissionsPage').then((m) => ({ default: m.AdminMediaSubmissionsPage })))
const AdminMembersPage = lazy(() => import('@/pages/admin/AdminMembersPage').then((m) => ({ default: m.AdminMembersPage })))
const AdminPollsPage = lazy(() => import('@/pages/admin/AdminPollsPage').then((m) => ({ default: m.AdminPollsPage })))
const AdminResourcesPage = lazy(() => import('@/pages/admin/AdminResourcesPage').then((m) => ({ default: m.AdminResourcesPage })))
const AdminServiceInterestsPage = lazy(() => import('@/pages/admin/AdminServiceInterestsPage').then((m) => ({ default: m.AdminServiceInterestsPage })))
const AdminSettingsPage = lazy(() => import('@/pages/admin/SettingsPage').then((m) => ({ default: m.AdminSettingsPage })))
const AdminSignInsPage = lazy(() => import('@/pages/admin/AdminSignInsPage').then((m) => ({ default: m.AdminSignInsPage })))
const AdminSubmissionsPage = lazy(() => import('@/pages/admin/SubmissionsPage').then((m) => ({ default: m.AdminSubmissionsPage })))
const AdminSystemHealthPage = lazy(() => import('@/pages/admin/AdminSystemHealthPage').then((m) => ({ default: m.AdminSystemHealthPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/UsersPage').then((m) => ({ default: m.AdminUsersPage })))
const AdminVendorDirectoryPage = lazy(() => import('@/pages/admin/AdminVendorDirectoryPage').then((m) => ({ default: m.AdminVendorDirectoryPage })))
const AdminVendorsPage = lazy(() => import('@/pages/admin/AdminVendorsPage').then((m) => ({ default: m.AdminVendorsPage })))
const AdminVolunteersPage = lazy(() => import('@/pages/admin/AdminVolunteersPage').then((m) => ({ default: m.AdminVolunteersPage })))
const AnnouncementDetailPage = lazy(() => import('@/pages/public/AnnouncementDetailPage').then((m) => ({ default: m.AnnouncementDetailPage })))
const AnnouncementsPage = lazy(() => import('@/pages/public/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage })))
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })))
const BusinessDetailPage = lazy(() => import('@/pages/public/BusinessDetailPage').then((m) => ({ default: m.BusinessDetailPage })))
const BusinessesPage = lazy(() => import('@/pages/public/BusinessesPage').then((m) => ({ default: m.BusinessesPage })))
const CalendarPage = lazy(() => import('@/pages/public/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const CertificateDevExportPage = lazy(() => import('@/pages/dev/CertificateDevExportPage').then((m) => ({ default: m.CertificateDevExportPage })))
const CertificatePreviewPage = lazy(() => import('@/pages/dev/CertificatePreviewPage').then((m) => ({ default: m.CertificatePreviewPage })))
const CertificatesAndAcknowledgementsPage = lazy(() => import('@/pages/public/CertificatesAndAcknowledgementsPage').then((m) => ({ default: m.CertificatesAndAcknowledgementsPage })))
const ChangePasswordPage = lazy(() => import('@/pages/member/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })))
const ChatPage = lazy(() => import('@/pages/public/ChatPage').then((m) => ({ default: m.ChatPage })))
const CollinsColloNamaswaMemorialPage = lazy(() => import('@/pages/public/CollinsColloNamaswaMemorialPage').then((m) => ({ default: m.CollinsColloNamaswaMemorialPage })))
const CommunityFeedPage = lazy(() => import('@/pages/public/CommunityFeedPage').then((m) => ({ default: m.CommunityFeedPage })))
const CommunityGroupsPage = lazy(() => import('@/pages/public/CommunityGroupsPage').then((m) => ({ default: m.CommunityGroupsPage })))
const CommunityGroupsSubmitPage = lazy(() => import('@/pages/public/CommunityGroupsSubmitPage').then((m) => ({ default: m.CommunityGroupsSubmitPage })))
const CommunitySupportPage = lazy(() => import('@/pages/public/CommunitySupportPage').then((m) => ({ default: m.CommunitySupportPage })))
const ContactPage = lazy(() => import('@/pages/public/ContactPage').then((m) => ({ default: m.ContactPage })))
const DisclaimerPage = lazy(() => import('@/pages/public/DisclaimerPage').then((m) => ({ default: m.DisclaimerPage })))
const EventDetailPage = lazy(() => import('@/pages/public/EventDetailPage').then((m) => ({ default: m.EventDetailPage })))
const EventVendorSignupPage = lazy(() => import('@/pages/public/EventVendorSignupPage').then((m) => ({ default: m.EventVendorSignupPage })))
const EventVolunteerSignupPage = lazy(() => import('@/pages/public/EventVolunteerSignupPage').then((m) => ({ default: m.EventVolunteerSignupPage })))
const EventsPage = lazy(() => import('@/pages/public/EventsPage').then((m) => ({ default: m.EventsPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const FundraiserDetailPage = lazy(() => import('@/pages/public/FundraiserDetailPage').then((m) => ({ default: m.FundraiserDetailPage })))
const GalleryPage = lazy(() => import('@/pages/public/GalleryPage').then((m) => ({ default: m.GalleryPage })))
const GallerySubmitPage = lazy(() => import('@/pages/public/GallerySubmitPage').then((m) => ({ default: m.GallerySubmitPage })))
const GovernancePage = lazy(() => import('@/pages/public/GovernancePage').then((m) => ({ default: m.GovernancePage })))
const LeadershipPage = lazy(() => import('@/pages/public/LeadershipPage').then((m) => ({ default: m.LeadershipPage })))
const MembershipPage = lazy(() => import('@/pages/public/MembershipPage').then((m) => ({ default: m.MembershipPage })))
const MembershipSuccessPage = lazy(() => import('@/pages/public/MembershipSuccessPage').then((m) => ({ default: m.MembershipSuccessPage })))
const MemorialsIndexPage = lazy(() => import('@/pages/public/MemorialsIndexPage').then((m) => ({ default: m.MemorialsIndexPage })))
const NewToHoustonPage = lazy(() => import('@/pages/public/NewToHoustonPage').then((m) => ({ default: m.NewToHoustonPage })))
const PollDetailPage = lazy(() => import('@/pages/public/PollDetailPage').then((m) => ({ default: m.PollDetailPage })))
const PollsIndexPage = lazy(() => import('@/pages/public/PollsIndexPage').then((m) => ({ default: m.PollsIndexPage })))
const PrivacyPage = lazy(() => import('@/pages/public/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const ProfileMediaPage = lazy(() => import('@/pages/member/ProfileMediaPage').then((m) => ({ default: m.ProfileMediaPage })))
const ProfilePage = lazy(() => import('@/pages/member/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const ResourcesPage = lazy(() => import('@/pages/public/ResourcesPage').then((m) => ({ default: m.ResourcesPage })))
const ServeApplyPage = lazy(() => import('@/pages/public/ServeApplyPage').then((m) => ({ default: m.ServeApplyPage })))
const ServePage = lazy(() => import('@/pages/public/ServePage').then((m) => ({ default: m.ServePage })))
const SportsDetailPage = lazy(() => import('@/pages/public/SportsDetailPage').then((m) => ({ default: m.SportsDetailPage })))
const SportsYouthPage = lazy(() => import('@/pages/public/SportsYouthPage').then((m) => ({ default: m.SportsYouthPage })))
const SubmitAnnouncementPage = lazy(() => import('@/pages/public/SubmitAnnouncementPage').then((m) => ({ default: m.SubmitAnnouncementPage })))
const SubmitBusinessPage = lazy(() => import('@/pages/public/SubmitBusinessPage').then((m) => ({ default: m.SubmitBusinessPage })))
const SubmitEventPage = lazy(() => import('@/pages/public/SubmitEventPage').then((m) => ({ default: m.SubmitEventPage })))
const SubmitFundraiserPage = lazy(() => import('@/pages/public/SubmitFundraiserPage').then((m) => ({ default: m.SubmitFundraiserPage })))
const SupportPage = lazy(() => import('@/pages/public/SupportPage').then((m) => ({ default: m.SupportPage })))
const TermsPage = lazy(() => import('@/pages/public/TermsPage').then((m) => ({ default: m.TermsPage })))

/** Carries a shared /directory/:slug link through to its /businesses/:slug listing. */
function BusinessDirectorySlugRedirect() {
  const { slug } = useParams()
  return <Navigate to={slug ? `/businesses/${slug}` : '/businesses'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* ── Public Routes ── */}
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />

            <Route path="events" element={<EventsPage />} />
            <Route path="events/submit" element={<SubmitEventPage />} />
            <Route path="events/:slug/volunteer" element={<EventVolunteerSignupPage />} />
            <Route path="events/:slug/vendor" element={<EventVendorSignupPage />} />
            <Route path="events/:slug" element={<EventDetailPage />} />
            <Route path="calendar" element={<CalendarPage />} />

            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="announcements/submit" element={<SubmitAnnouncementPage />} />
            <Route path="announcements/:slug" element={<AnnouncementDetailPage />} />

            <Route path="businesses" element={<BusinessesPage />} />
            <Route path="businesses/submit" element={<SubmitBusinessPage />} />
            <Route path="businesses/:slug" element={<BusinessDetailPage />} />
            {/* The directory is called the "business directory" everywhere it is
                shared, so /directory gets typed and pasted even though the route
                is /businesses. Keep both resolving. */}
            <Route path="directory" element={<Navigate to="/businesses" replace />} />
            <Route path="directory/:slug" element={<BusinessDirectorySlugRedirect />} />

            <Route path="community-support" element={<CommunitySupportPage />} />
            <Route path="community-support/submit" element={<SubmitFundraiserPage />} />
            <Route path="community-support/:slug" element={<FundraiserDetailPage />} />

            {/* Permanent memorial URLs — do not rename (printed QR destinations). */}
            <Route path="memorials" element={<MemorialsIndexPage />} />
            <Route
              path="memorials/collins-collo-namaswa"
              element={<CollinsColloNamaswaMemorialPage />}
            />

            <Route path="sports-youth" element={<SportsYouthPage />} />
            <Route path="sports-youth/:slug" element={<SportsDetailPage />} />

            <Route path="gallery" element={<GalleryPage />} />
            <Route path="gallery/submit" element={<GallerySubmitPage />} />
            <Route path="new-to-houston" element={<NewToHoustonPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="chat" element={<PasswordExpiryRouteGate><ChatPage /></PasswordExpiryRouteGate>} />
            <Route path="community-feed" element={<PasswordExpiryRouteGate><CommunityFeedPage /></PasswordExpiryRouteGate>} />
            <Route path="governance" element={<GovernancePage />} />
            <Route path="leadership" element={<LeadershipPage />} />
            <Route path="serve" element={<ServePage />} />
            <Route path="serve/apply" element={<ServeApplyPage />} />
            <Route path="membership" element={<MembershipPage />} />
            <Route path="membership/success" element={<MembershipSuccessPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="certificates-and-acknowledgements" element={<CertificatesAndAcknowledgementsPage />} />
            {import.meta.env.DEV ? (
              <>
                <Route path="dev/certificate-preview" element={<CertificatePreviewPage />} />
                <Route path="dev/certificate-export" element={<CertificateDevExportPage />} />
              </>
            ) : null}
            <Route path="login" element={<LoginPage />} />
            <Route path="admin/login" element={<LoginPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="change-password"
              element={
                <RequireAuth>
                  <ChangePasswordPage />
                </RequireAuth>
              }
            />
            <Route
              path="profile"
              element={
                <RequireAuth>
                  <RequiresFreshPassword>
                    <ProfilePage />
                  </RequiresFreshPassword>
                </RequireAuth>
              }
            />
            <Route
              path="profile/media"
              element={
                <RequireAuth>
                  <RequiresFreshPassword>
                    <ProfileMediaPage />
                  </RequiresFreshPassword>
                </RequireAuth>
              }
            />
            <Route path="community-groups" element={<CommunityGroupsPage />} />
            <Route path="community-groups/submit" element={<CommunityGroupsSubmitPage />} />

            <Route path="polls" element={<PollsIndexPage />} />
            <Route path="polls/:slug" element={<PollDetailPage />} />

            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="disclaimer" element={<DisclaimerPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* ── Admin Protected Routes ── */}
          <Route
            path="admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="change-password" element={<AdminChangePasswordPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="sign-ins" element={<AdminSignInsPage />} />
            <Route
              path="system-health"
              element={
                <ProtectedRoute requiredRoles={SYSTEM_HEALTH_ADMIN_ROLES}>
                  <AdminSystemHealthPage />
                </ProtectedRoute>
              }
            />
            <Route path="events" element={<Navigate to="/admin/calendar" replace />} />
            <Route path="calendar" element={<AdminCalendarPage />} />
            <Route path="resources" element={<AdminResourcesPage />} />
            <Route path="members" element={<AdminMembersPage />} />
            <Route path="community-groups" element={<AdminCommunityGroupsPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="businesses" element={<AdminBusinessesPage />} />
            <Route path="fundraisers" element={<AdminFundraisersPage />} />
            <Route path="gallery" element={<AdminGalleryPage />} />
            <Route path="leadership" element={<AdminLeadershipPage />} />
            <Route path="polls" element={<AdminPollsPage />} />
            <Route path="submissions" element={<AdminSubmissionsPage />} />
            <Route path="contacts" element={<AdminContactsPage />} />
            <Route path="chat" element={<AdminChatPage />} />
            <Route path="event-comments" element={<AdminEventCommentsPage />} />
            <Route path="volunteers" element={<AdminVolunteersPage />} />
            <Route path="vendors" element={<AdminVendorsPage />} />
            <Route path="vendors-directory" element={<AdminVendorDirectoryPage />} />
            <Route path="invites" element={<AdminInvitesPage />} />
            <Route path="feed" element={<AdminFeedPage />} />
            <Route path="service-interests" element={<AdminServiceInterestsPage />} />
            <Route path="media-submissions" element={<AdminMediaSubmissionsPage />} />
            <Route path="certificates" element={<AdminCertificatesPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
          </Routes>
        </Suspense>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  )
}
