# Kenyan Community Houston Website — System User Manual

**Project:** Kenyan Community Houston / KIGH
**Audience:** Community members, regular users, content submitters, admins, platform admins, and super admins
**Current environment:** Staging/UAT before clean production duplication
**Super admin:** [admin@kenyancommunityhouston.org](mailto:admin@kenyancommunityhouston.org)
**Last updated:** May 2026

---

## 1. Purpose of the System

The Kenyan Community Houston website is a central community hub for Kenyans in Houston and surrounding areas. The goal is to reduce clutter in WhatsApp groups and give the community one trusted place for:

* Events and calendar updates
* Announcements
* Community support and fundraisers
* Business directory listings
* Community groups and institutions
* Sports and youth updates
* Gallery/media sharing
* Newcomer resources
* Membership and family registration
* Governance and official community information
* Contact and service/volunteer interest submissions

The website does not replace urgent communication channels. WhatsApp and direct communication can still be used for emergencies and urgent community alerts. The website is meant to organize information, preserve records, and make community participation easier.

---

## 2. User Types and Access Levels

### 2.1 Public Visitor

A public visitor can browse public content without logging in.

Public visitors can view:

* Homepage
* Events
* Calendar
* Announcements
* Businesses
* Fundraisers/community support
* Community groups
* Sports and youth posts
* Gallery
* Resources
* New to Houston information
* Governance information
* Contact page

Public visitors can submit content for review, but submitted content does not appear publicly until approved by an admin.

---

### 2.2 Member / Community User

A member account is used for community membership, profile access, and member-related workflows.

Members may be able to:

* Register or update membership details
* Login to member profile area
* Submit profile/media information where enabled
* Access member-specific flows if activated

Member/private information must not be publicly visible unless explicitly designed as public content.

---

### 2.3 Community Admin

A community admin can help manage regular community operations. This role should be used for trusted community testers or administrators who need to review and manage content.

Community admins may manage or review items such as:

* Events
* Announcements
* Businesses
* Fundraisers
* Community groups
* Gallery/media submissions
* Contact messages, if role access allows
* Resources, if role access allows

Community admins must not have access to infrastructure-level System Health.

Community admins cannot create:

* super_admin
* platform_admin
* another community_admin

---

### 2.4 Platform Admin

A platform admin is a top-level operational role. Platform admins can manage broad platform operations and access System Health.

Platform admins can:

* Access System Health
* Access Analytics
* Manage operational admin functions as permitted
* Create regular operational admin roles

Platform admins cannot create:

* super_admin
* platform_admin, unless leadership later changes the policy

---

### 2.5 Super Admin

The super admin is the highest-level administrator.

The designated super admin account is:

**[admin@kenyancommunityhouston.org](mailto:admin@kenyancommunityhouston.org)**

Super admin can:

* Access all admin areas
* Access System Health
* Access Analytics
* Create platform_admin users
* Create operational admin users
* Manage top-level administrative setup
* Bootstrap production admin structure

Super admin should be used carefully and only by trusted leadership/platform operators.

---

## 3. Public Website Navigation

The public header is intentionally simplified so the site feels less crowded.

### 3.1 Main Navigation

Top-level navigation includes:

* Events
* Calendar
* Businesses
* Community Support
* Gallery
* More

### 3.2 More Menu

The More menu groups additional pages:

**Programs**

* Sports & Youth
* Membership
* Call to Serve

**Discover**

* Community Groups
* Resources
* New to Houston

**About KIGH**

* Governance
* About
* Contact

**Support**

* Support KIGH

### 3.3 Admin Login

Admin Login is visible but secondary. Admin users should use the Admin Login link to access the admin dashboard.

---

## 4. Homepage Overview

The homepage is designed to be warm, photo-led, and community-centered.

Key homepage sections:

1. Hero section with main community message
2. Start Here quick links
3. Why We Are Here / community benefit cards
4. Upcoming Gatherings
5. Community in Action photo area
6. Updates & Ways to Help
7. New to Houston / Get Involved closing section
8. Footer with legal and admin links

The homepage should guide visitors toward joining, finding events, supporting the community, and learning where to go next.

---

## 5. Events and Calendar

### 5.1 Viewing Events

Public visitors can view events through:

* Events page
* Calendar page
* Homepage Upcoming Gatherings section

Only published events should appear publicly.

Pending, rejected, draft, or archived events should not appear publicly.

---

### 5.2 Submitting an Event

A public user can submit an event through the Submit Event form.

Typical fields include:

* Event title
* Category
* Description
* Date
* Time
* Location
* Address
* Registration or ticket link, if applicable
* Flyer / poster link
* Flyer / poster upload
* Organizer details

Submitted events go into a pending review queue.

They do not appear publicly until approved by an admin.

---

### 5.3 Flyer / Poster Uploads

Event submitters can upload a flyer or poster image/PDF.

Supported file behavior:

* Files are uploaded to a dedicated submission media bucket
* Uploads use random safe paths
* Public users cannot overwrite or delete files
* Admins review the submitted flyer before approval
* Approved content can display the flyer publicly

Admins should verify that uploaded flyers are appropriate before approval.

---

### 5.4 Recurring Events

Recurring events use permanent recurrence metadata.

For public display:

* One-off future events show normally
* Recurring event series show only the next upcoming occurrence
* Future occurrences remain stored but do not clutter the public calendar
* After the next occurrence passes, the following occurrence becomes the next visible one

This keeps the calendar clean while preserving recurring schedules.

---

### 5.5 Addresses and Google Maps

Event addresses should open in Google Maps when clicked.

If both location and address are available, the full address should be used for the map search.

---

## 6. Announcements

### 6.1 Viewing Announcements

Public visitors can view published announcements.

Only approved/published announcements should appear publicly.

---

### 6.2 Submitting an Announcement

Users can submit announcements for review.

Announcement submissions may include:

* Title
* Category
* Summary
* Details
* Image/flyer upload
* External link, if applicable
* Optional calendar event details

---

### 6.3 Announcement + Calendar Event

Some announcements are also events. If the announcement includes a date, time, and location, it can be submitted as both:

* Announcement
* Calendar event

When approved, the system should create or link the related published event.

Admins should confirm that event-related announcements are correctly marked for calendar inclusion.

---

## 7. Businesses

### 7.1 Business Directory

The business directory helps community members find Kenyan/community businesses and services.

Public visitors can view approved business listings.

---

### 7.2 Submitting a Business

Users can submit a business for review.

Typical fields include:

* Business name
* Category
* Description
* Location/service area
* Website
* Contact information
* Social link, if applicable

Business submissions remain pending until approved by an admin.

---

### 7.3 Business Website Links

If a business has a website, the link should open externally in a new tab.

Website links are normalized and protected against unsafe protocols.

---

## 8. Community Groups and Institutions

### 8.1 Purpose

Community Groups is for organizations, churches, institutions, associations, sports groups, cultural groups, and other community structures.

---

### 8.2 Viewing Community Groups

Public visitors can view approved community groups.

Each listing may include:

* Organization name
* Category
* Location/service area
* Description
* Website link
* Social link
* Meeting location, if applicable

---

### 8.3 Submitting a Community Group

Users can submit a group/institution for review.

Website links are optional.

If a user enters a bare domain such as:

`kighsacc.org`

The system should normalize it to:

`https://kighsacc.org`

Unsafe links such as `javascript:` or `data:` must not be allowed as clickable public links.

---

## 9. Fundraisers and Community Support

### 9.1 Viewing Fundraisers

Published fundraisers appear under Community Support or Fundraisers.

Fundraisers may include:

* Title
* Beneficiary
* Organizer
* Goal amount
* Summary/details
* Donation link, if available

---

### 9.2 Submitting a Fundraiser

Users can submit a fundraiser for review.

Admins should verify the fundraiser details before approval.

---

### 9.3 Donation Links

Donation links should be treated carefully.

The system protects public rendering by validating links before making them clickable.

Admins should still manually verify donation links before approving fundraisers.

---

## 10. Gallery and Media

### 10.1 Public Gallery

The gallery displays approved community images/media.

Pending media should not be publicly visible.

---

### 10.2 Media Review

Admins should review submitted media before it appears publicly.

Media should be rejected or held if it is inappropriate, private, unclear, duplicated, or not relevant to the community.

---

## 11. Resources and Courses Policy

KIGH resources, guides, learning materials, newcomer guides, civic information, and community education content should be free community resources.

The KIGH website should not introduce:

* Paid course access
* Paid learning content
* Course checkout
* Education subscriptions
* Paywalled community guides

Fundraisers and donations are allowed separately, but they should not be framed as payment for access to community learning resources.

---

## 12. Membership

The website supports membership or family registration flows.

Membership flows may collect personal/family information.

This information must remain protected and should not be publicly visible.

Admins should handle membership information carefully.

---

## 13. Admin Dashboard

### 13.1 Purpose

The admin dashboard gives administrators an operational view of the community website.

The dashboard may show:

* Pending submissions
* Pending members
* Upcoming events
* Recent contact messages
* Published content counts
* Community activity this week
* Shortcuts to review queues

---

### 13.2 Admin Responsibilities

Admins should:

* Review pending submissions regularly
* Approve only accurate and appropriate content
* Reject spam, unsafe, or unclear submissions
* Keep events and announcements clean and current
* Avoid publishing private information unintentionally
* Verify external links before approval

---

## 14. Analytics

Analytics help admins understand usage and engagement.

Analytics may track:

* Page views
* Clicks
* Entity views/clicks
* Logins
* Submissions created
* Map link opens

Analytics must not track:

* Passwords
* Tokens
* Private contact message bodies
* Private member/family details
* Payment information
* Large arbitrary metadata

Analytics are visible only to elevated admins.

---

## 15. System Health

### 15.1 Access

System Health is restricted to:

* super_admin
* platform_admin

Regular community admins should not see the System Health sidebar link and should not be able to open `/admin/system-health` directly.

### 15.2 What System Health Shows

System Health may show:

* Environment label
* Supabase host
* Database connectivity
* Database size
* Storage usage/counts
* Table counts
* Pending/inbox-style counts
* Last checked timestamp

System Health must not expose secrets, service role keys, private row contents, auth user dumps, or sensitive member/contact data.

---

## 16. Admin User Management

### 16.1 Role Creation Rules

The role matrix is enforced on the frontend and backend.

**super_admin can create:**

* super_admin
* platform_admin
* community_admin
* content_manager
* membership_manager
* treasurer
* media_moderator
* ads_manager
* business_admin
* support_admin
* moderator
* viewer
* member, if supported

**platform_admin can create:**

* community_admin
* content_manager
* membership_manager
* treasurer
* media_moderator
* ads_manager
* business_admin
* support_admin
* moderator
* viewer
* member, if supported

**community_admin can create only lower operational roles, not peer or top-level roles.**

Community admin cannot create:

* super_admin
* platform_admin
* community_admin

Lower roles cannot create elevated roles.

Unknown roles are denied.

---

### 16.2 Super Admin

The first/top-level super admin account is:

**[admin@kenyancommunityhouston.org](mailto:admin@kenyancommunityhouston.org)**

This account should be bootstrapped carefully in production and protected with a strong password.

---

## 17. Admin Review Workflows

### 17.1 Events

Admin review flow:

1. Open Admin Dashboard or Submissions
2. Review pending event
3. Check title, dates, time, location, description, flyer, and links
4. Approve if accurate
5. Reject if spam, unsafe, incomplete, or inappropriate

Approved events become public.

---

### 17.2 Announcements

Admin review flow:

1. Review announcement content
2. Check whether it should also be added to calendar
3. Verify image/flyer and links
4. Approve or reject

---

### 17.3 Businesses

Admin review flow:

1. Verify the business appears legitimate
2. Check website/contact information
3. Confirm category and description
4. Approve or reject

---

### 17.4 Fundraisers

Admin review flow:

1. Confirm beneficiary and organizer
2. Verify donation link
3. Check fundraiser details
4. Approve only if trusted and clear

---

### 17.5 Community Groups

Admin review flow:

1. Confirm organization/group details
2. Check website/social links
3. Verify category and description
4. Approve or reject

---

## 18. Security Rules for Admins

Admins should follow these rules:

* Do not publish private member/family details
* Do not publish private contact messages
* Do not approve suspicious links
* Do not approve unsafe flyer or media content
* Do not share admin passwords
* Do not create unnecessary admin accounts
* Use the lowest role needed for each person
* Remove temporary UAT users after testing
* Keep System Health limited to top-level admins
* Confirm external links before approving content

---

## 19. Staging/UAT Notes

The current staging/UAT URL may be deployed through Vercel as a production-labeled deployment, but it should still be treated as staging until final production duplication is complete.

The staging banner should appear in staging/development.

If a tester sees an outdated page, they should hard refresh or use an incognito/private window.

---

## 20. Production Duplication Rules

Production must be created as a clean environment.

Do not copy from staging:

* Staging database rows
* UAT users
* Auth users
* Analytics events
* Contact messages
* Members/family records
* Pending submissions
* Storage objects
* Test files
* UAT helper data

Production should be created using:

* GitHub main branch
* Supabase migrations 001–024
* Production-safe seed/bootstrap only
* Real production environment variables
* Real super admin bootstrap
* Clean smoke testing

---

## 21. Production Bootstrap Summary

For production:

1. Create new Supabase project
2. Enable Storage before migrations that create buckets
3. Apply migrations 001–024
4. Do not run local/demo seed.sql
5. Use production-safe seed/bootstrap only if needed
6. Invite `admin@kenyancommunityhouston.org` as the first super admin
7. Run the super-admin bootstrap process
8. Deploy Edge Functions with service role key set server-side only
9. Configure Vercel production environment variables
10. Deploy frontend
11. Smoke test public pages, admin pages, uploads, role governance, analytics, System Health, and recurring events
12. Confirm staging banner is hidden in production
13. Point domain/DNS only after smoke passes

---

## 22. Common Admin Tasks

### Approve an Event

1. Login as admin
2. Go to Submissions or Calendar/Admin Events
3. Open the pending event
4. Review date, time, location, flyer, and links
5. Approve
6. Confirm it appears publicly on Events/Calendar

### Approve a Fundraiser

1. Login as admin
2. Open Fundraisers or Submissions
3. Verify organizer, beneficiary, goal, and donation link
4. Approve or reject
5. Confirm approved fundraiser appears publicly

### Add a Platform Admin

Only super_admin should do this.

1. Login as super_admin
2. Go to Admin Users
3. Create user
4. Select platform_admin
5. Send credentials/invite securely
6. Confirm platform admin can login and see System Health

### Confirm Community Admin Restrictions

1. Login as community_admin
2. Confirm System Health is not visible
3. Confirm `/admin/system-health` redirects/blocks
4. Confirm top-level roles are not available in Admin Users

---

## 23. Troubleshooting

### Admin page looks outdated

Hard refresh:

* Mac: Cmd + Shift + R
* Windows: Ctrl + Shift + R

Or open in an incognito/private window.

### Submitted event is not visible publicly

Check:

* Status is published
* Published date exists if required
* It is not archived/rejected
* Calendar/event fields were created correctly
* Recurring event dedupe is showing only the next occurrence

### Website link opens incorrectly

Check that the URL is valid. Bare domains should normalize to `https://...`.

Unsafe protocols should not render as clickable links.

### Flyer does not show

Check:

* File uploaded successfully
* Submission was approved
* Flyer URL exists in the approved record
* Public display uses image/flyer fallback

### System Health missing

Confirm the logged-in user is:

* super_admin, or
* platform_admin

Community admins should not see System Health.

---

## 24. Final Pre-Production Checklist

Before duplication:

* Git working tree clean
* GitHub main has latest commits
* Build passes
* Smoke tests pass
* Supabase migrations 001–024 confirmed
* Edge Functions deployed to staging
* Admin role governance tested
* System Health access tested
* Public/pending data visibility tested
* Flyer uploads tested
* External links tested
* Recurring events tested
* Homepage, mobile, and public routes tested
* Production bootstrap docs reviewed
* UAT users identified for removal
* No staging data copied to production

---

## 25. One-Line Operating Principle

If content is public, it must be approved and safe. If data is private, it must stay behind the correct role, route, and RLS fence.

