import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { HelmetProvider } from 'react-helmet-async'

import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

import { PublicLayout } from '@/components/layout/PublicLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'

import { HomePage } from '@/pages/public/HomePage'
import { EventsPage } from '@/pages/public/EventsPage'
import { EventDetailPage } from '@/pages/public/EventDetailPage'
import { CalendarPage } from '@/pages/public/CalendarPage'
import { AnnouncementsPage } from '@/pages/public/AnnouncementsPage'
import { AnnouncementDetailPage } from '@/pages/public/AnnouncementDetailPage'
import { BusinessesPage } from '@/pages/public/BusinessesPage'
import { BusinessDetailPage } from '@/pages/public/BusinessDetailPage'
import { CommunitySupportPage } from '@/pages/public/CommunitySupportPage'
import { FundraiserDetailPage } from '@/pages/public/FundraiserDetailPage'
import { SportsYouthPage } from '@/pages/public/SportsYouthPage'
import { SportsDetailPage } from '@/pages/public/SportsDetailPage'
import { GalleryPage } from '@/pages/public/GalleryPage'
import { NewToHoustonPage } from '@/pages/public/NewToHoustonPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { ContactPage } from '@/pages/public/ContactPage'
import { GovernancePage } from '@/pages/public/GovernancePage'
import { MembershipPage } from '@/pages/public/MembershipPage'
import { MembershipSuccessPage } from '@/pages/public/MembershipSuccessPage'
import { SupportPage } from '@/pages/public/SupportPage'
import { ResourcesPage } from '@/pages/public/ResourcesPage'
import { CommunityGroupsPage } from '@/pages/public/CommunityGroupsPage'
import { CommunityGroupsSubmitPage } from '@/pages/public/CommunityGroupsSubmitPage'
import { ServePage } from '@/pages/public/ServePage'
import { ServeApplyPage } from '@/pages/public/ServeApplyPage'
import { SubmitEventPage } from '@/pages/public/SubmitEventPage'
import { SubmitAnnouncementPage } from '@/pages/public/SubmitAnnouncementPage'
import { SubmitBusinessPage } from '@/pages/public/SubmitBusinessPage'
import { SubmitFundraiserPage } from '@/pages/public/SubmitFundraiserPage'
import { PrivacyPage } from '@/pages/public/PrivacyPage'
import { TermsPage } from '@/pages/public/TermsPage'
import { DisclaimerPage } from '@/pages/public/DisclaimerPage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'
import { ChatPage } from '@/pages/public/ChatPage'

import { AdminDashboardPage } from '@/pages/admin/DashboardPage'
import { AdminCalendarPage } from '@/pages/admin/CalendarPage'
import { AdminAnnouncementsPage } from '@/pages/admin/AnnouncementsPage'
import { AdminBusinessesPage } from '@/pages/admin/BusinessesPage'
import { AdminFundraisersPage } from '@/pages/admin/FundraisersPage'
import { AdminGalleryPage } from '@/pages/admin/GalleryPage'
import { AdminSubmissionsPage } from '@/pages/admin/SubmissionsPage'
import { AdminContactsPage } from '@/pages/admin/ContactsPage'
import { AdminSettingsPage } from '@/pages/admin/SettingsPage'
import { AdminUsersPage } from '@/pages/admin/UsersPage'
import { AdminChangePasswordPage } from '@/pages/admin/AdminChangePasswordPage'
import { AdminResourcesPage } from '@/pages/admin/AdminResourcesPage'
import { AdminMembersPage } from '@/pages/admin/AdminMembersPage'
import { AdminCommunityGroupsPage } from '@/pages/admin/AdminCommunityGroupsPage'
import { AdminServiceInterestsPage } from '@/pages/admin/AdminServiceInterestsPage'
import { AdminMediaSubmissionsPage } from '@/pages/admin/AdminMediaSubmissionsPage'
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage'
import { AdminSystemHealthPage } from '@/pages/admin/AdminSystemHealthPage'
import { AdminChatPage } from '@/pages/admin/AdminChatPage'
import { AdminEventCommentsPage } from '@/pages/admin/AdminEventCommentsPage'
import { AdminInvitesPage } from '@/pages/admin/AdminInvitesPage'
import { SYSTEM_HEALTH_ADMIN_ROLES } from '@/lib/platformAdmin'

import { RequireAuth } from '@/components/RequireAuth'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { ProfilePage } from '@/pages/member/ProfilePage'
import { ProfileMediaPage } from '@/pages/member/ProfileMediaPage'

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public Routes ── */}
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />

              <Route path="events" element={<EventsPage />} />
              <Route path="events/:slug" element={<EventDetailPage />} />
              <Route path="events/submit" element={<SubmitEventPage />} />
              <Route path="calendar" element={<CalendarPage />} />

              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="announcements/:slug" element={<AnnouncementDetailPage />} />
              <Route path="announcements/submit" element={<SubmitAnnouncementPage />} />

              <Route path="businesses" element={<BusinessesPage />} />
              <Route path="businesses/:slug" element={<BusinessDetailPage />} />
              <Route path="businesses/submit" element={<SubmitBusinessPage />} />

              <Route path="community-support" element={<CommunitySupportPage />} />
              <Route path="community-support/:slug" element={<FundraiserDetailPage />} />
              <Route path="community-support/submit" element={<SubmitFundraiserPage />} />

              <Route path="sports-youth" element={<SportsYouthPage />} />
              <Route path="sports-youth/:slug" element={<SportsDetailPage />} />

              <Route path="gallery" element={<GalleryPage />} />
              <Route path="new-to-houston" element={<NewToHoustonPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="governance" element={<GovernancePage />} />
              <Route path="serve" element={<ServePage />} />
              <Route path="serve/apply" element={<ServeApplyPage />} />
              <Route path="membership" element={<MembershipPage />} />
              <Route path="membership/success" element={<MembershipSuccessPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="admin/login" element={<LoginPage />} />
              <Route path="auth/callback" element={<AuthCallbackPage />} />
              <Route
                path="profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
              <Route
                path="profile/media"
                element={
                  <RequireAuth>
                    <ProfileMediaPage />
                  </RequireAuth>
                }
              />
              <Route path="community-groups" element={<CommunityGroupsPage />} />
              <Route path="community-groups/submit" element={<CommunityGroupsSubmitPage />} />

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
              <Route path="submissions" element={<AdminSubmissionsPage />} />
              <Route path="contacts" element={<AdminContactsPage />} />
              <Route path="chat" element={<AdminChatPage />} />
              <Route path="event-comments" element={<AdminEventCommentsPage />} />
              <Route path="invites" element={<AdminInvitesPage />} />
              <Route path="service-interests" element={<AdminServiceInterestsPage />} />
              <Route path="media-submissions" element={<AdminMediaSubmissionsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
            </Route>
          </Routes>
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  )
}
