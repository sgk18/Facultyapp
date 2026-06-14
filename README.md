# CHRIST Faculty App

CHRIST Faculty App is a faculty productivity and academic management platform that centralizes deadlines, notifications, scheduling, and administrative oversight for CHRIST University. The system serves Faculty, HOD, and Admin roles with role-based access controls, real-time notifications, and integrations for institutional workflows.
## Project Overview

The platform addresses fragmented academic workflows by offering a single source of truth for deadlines, department coordination, and institutional communications. It provides a Flutter-based faculty experience, a Next.js backend API, and an embedded admin console for governance and analytics. The project goal is to streamline faculty operations, improve accountability, and enable secure integrations with university systems.

## System Architecture

```mermaid
flowchart LR
  subgraph Client["Client Applications"]
    Flutter["Flutter Mobile App"]
    AdminUI["Admin Web Console (Next.js /admin)"]
  end

  subgraph Backend["Backend API (Next.js App Router)"]
    API["/api routes"]
    Services["Services + Validators + Middleware"]
  end

  subgraph Data["Data Layer"]
    Supabase["Supabase Postgres"]
    Prisma["Prisma ORM"]
  end

  subgraph External["External Services"]
    FCM["Firebase Cloud Messaging"]
    Resend["Resend Email"]
    GoogleOAuth["Google OAuth"]
    Gmail["Gmail API"]
    GCal["Google Calendar API"]
  end

  Flutter --> API
  AdminUI --> API
  API --> Services
  Services --> Prisma
  Prisma --> Supabase
  Services --> FCM
  Services --> Resend
  Services --> GoogleOAuth
  GoogleOAuth --> Gmail
  GoogleOAuth --> GCal
```

**Component Summary**

| Component | Purpose | Key Files |
| --- | --- | --- |
| Flutter app | Faculty-facing client experience | `lib/` |
| Next.js API | REST APIs and admin console | `server/src/app/api`, `server/src/app/admin` |
| Prisma ORM | Data access and schema | `server/prisma/schema.prisma` |
| Supabase Postgres | Primary database | Supabase project |
| FCM | Push notifications | `server/src/lib/firebase.ts` |
| Resend | Email dispatch | `server/src/lib/resend.ts` |
| Google OAuth | OAuth for Gmail/Calendar | `server/src/lib/google.ts` |

## Authentication Architecture

### Current JWT Flow (Implemented)

```mermaid
sequenceDiagram
  participant User
  participant Flutter
  participant API as Next.js API
  participant Auth as AuthService
  participant DB as Prisma/Supabase

  User->>Flutter: Enter email/password
  Flutter->>API: POST /api/auth/login
  API->>Auth: Validate credentials
  Auth->>DB: Load or create user
  DB-->>Auth: User profile
  Auth->>API: Issue JWT
  API-->>Flutter: accessToken + user profile
  Flutter->>API: Bearer JWT on protected APIs
  API->>API: verifyAuth() + requireRoles()
```

### Supabase Auth Flow (Target Architecture)

This flow is part of the target architecture described in the project context. The current implementation uses local JWT issuance; Supabase Auth integration can replace the local JWT issuer when enabled.

```mermaid
sequenceDiagram
  participant User
  participant Flutter
  participant SupabaseAuth as Supabase Auth
  participant API as Next.js API

  User->>Flutter: Login
  Flutter->>SupabaseAuth: Authenticate
  SupabaseAuth-->>Flutter: Supabase JWT
  Flutter->>API: Bearer Supabase JWT
  API->>API: Verify token + role
  API-->>Flutter: Protected data
```

## Database Architecture

```mermaid
erDiagram
  Department ||--o{ User : has
  Department ||--o{ Deadline : has
  User ||--o{ Deadline : creates
  User ||--o{ Notification : receives
  User ||--o{ PushToken : owns
  User ||--o{ Reminder : schedules
  User ||--o{ CalendarEvent : owns
  User ||--|| GoogleAccount : connects
  User ||--o{ AuditLog : performs
  Deadline ||--o{ Notification : relates

  Department {
    UUID id
    string name
    string code
    datetime createdAt
    datetime updatedAt
  }
  User {
    UUID id
    UUID authUserId
    string email
    string passwordHash
    string fullName
    string employeeId
    enum role
    boolean isSuspended
    UUID departmentId
    string avatarUrl
    datetime createdAt
    datetime updatedAt
  }
  Deadline {
    UUID id
    string title
    string description
    datetime dueDate
    enum priority
    UUID createdById
    UUID departmentId
    boolean isCompleted
    datetime createdAt
    datetime updatedAt
  }
  Notification {
    UUID id
    UUID userId
    string title
    string body
    string type
    boolean isRead
    UUID relatedDeadlineId
    datetime createdAt
  }
  PushToken {
    UUID id
    UUID userId
    string fcmToken
    string platform
    datetime updatedAt
  }
  GoogleAccount {
    UUID id
    UUID userId
    string googleId
    string accessToken
    string refreshToken
    boolean syncGmail
    boolean syncCalendar
    datetime connectedAt
    datetime updatedAt
  }
  CalendarEvent {
    UUID id
    UUID userId
    string googleEventId
    string title
    datetime startTime
    datetime endTime
    string source
    datetime createdAt
    datetime updatedAt
  }
  Reminder {
    UUID id
    UUID userId
    string title
    string description
    datetime reminderTime
    string status
    datetime createdAt
    datetime updatedAt
  }
  AuditLog {
    UUID id
    UUID adminId
    string action
    string targetUser
    datetime timestamp
  }
```

## Folder Structure

```
.
├── docs
│   └── design_system.md
├── lib
│   ├── core
│   │   ├── constants
│   │   ├── network
│   │   ├── router
│   │   ├── theme
│   │   └── widgets
│   └── features
│       ├── auth
│       ├── calendar
│       ├── dashboard
│       ├── deadlines
│       ├── navigation
│       ├── notifications
│       ├── profile
│       └── splash
├── server
│   ├── prisma
│   ├── src
│   │   ├── app
│   │   ├── lib
│   │   ├── middleware
│   │   ├── services
│   │   ├── utils
│   │   └── validators
│   ├── next.config.js
│   ├── vercel.json
│   ├── package.json
│   └── .env.example
└── pubspec.yaml
```

| Folder | Purpose |
| --- | --- |
| `docs/` | Design system and brand standards |
| `lib/` | Flutter application source |
| `lib/core/` | Shared constants, routing, networking, widgets, and theme |
| `lib/features/` | Feature modules (auth, deadlines, notifications, etc.) |
| `server/` | Next.js backend API and admin console |
| `server/src/app/api/` | REST API route handlers |
| `server/src/services/` | Business logic and orchestrations |
| `server/src/middleware/` | Auth and role guards |
| `server/prisma/` | Database schema and Supabase upgrade scripts |

## Backend Architecture

The backend is a Next.js App Router project providing REST APIs and an admin console. It uses Prisma to access Supabase Postgres and exposes API routes under `/api/*`.

| Layer | Responsibility | Key Files |
| --- | --- | --- |
| API Routes | HTTP entry points and response formatting | `server/src/app/api/**/route.ts` |
| Middleware | Authentication and role enforcement | `server/src/middleware/*.ts` |
| Services | Core business logic | `server/src/services/*.ts` |
| Validators | Input validation (Zod) | `server/src/validators/*.ts` |
| Utils | Error handling and branding constants | `server/src/utils/*.ts` |
| Data Access | Prisma client | `server/src/lib/prisma.ts` |

## Frontend Architecture

The Flutter app is modularized by feature, using Riverpod for state management, GoRouter for navigation, and Dio for API calls.

| Concern | Implementation | Key Files |
| --- | --- | --- |
| State Management | Riverpod + StateNotifier | `lib/features/auth/presentation/auth_notifier.dart` |
| Routing | GoRouter + ShellRoute | `lib/core/router/app_router.dart` |
| API Client | Dio + secure token injection | `lib/core/network/api_client.dart` |
| Secure Storage | Flutter Secure Storage | `lib/core/network/api_client.dart` |
| Theming | Central theme tokens | `lib/core/theme/app_theme.dart` |

## Authentication and Authorization

**Authentication**

| Mechanism | Description | Status |
| --- | --- | --- |
| Email/Password | Local credential validation with JWT issuance | Implemented |
| Google OAuth | OAuth flow with token exchange and account linking | Implemented |
| Supabase Auth | Repository configured for Supabase credentials | Target architecture |

**Role Hierarchy**

ADMIN > HOD > FACULTY

**Permission Matrix**

| Capability | ADMIN | HOD | FACULTY |
| --- | --- | --- | --- |
| View own profile | Yes | Yes | Yes |
| Manage departments | Yes | No | No |
| Promote/Demote HOD | Yes | No | No |
| Suspend users | Yes | No | No |
| View department faculty list | Yes | Yes | No |
| Create deadlines | Yes | Yes | Yes (own department only) |
| View deadlines | Yes | Yes | Yes (own department only) |
| View admin analytics | Yes | No | No |
| View audit logs | Yes | No | No |

## API Documentation

| Method | Endpoint | Description | Auth Required | Role Required |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | Email/password login | No | Public |
| POST | `/api/auth/logout` | Logout (stateless) | Yes | Any |
| GET | `/api/auth/me` | Current user profile | Yes | Any |
| GET | `/api/auth/google` | Start Google OAuth | No | Public |
| GET | `/api/auth/google/callback` | OAuth callback and token issuance | No | Public |
| GET | `/api/auth/google/consent` | Read Gmail/Calendar consent flags | Yes | Any |
| POST | `/api/auth/google/consent` | Update Gmail/Calendar consent | Yes | Any |
| DELETE | `/api/auth/google/consent` | Disconnect Google account | Yes | Any |
| GET | `/api/users` | List all users | Yes | Any |
| PATCH | `/api/users` | Update own profile or admin updates | Yes | Admin if updating other users or roles |
| GET | `/api/users/me` | Current user profile | Yes | Any |
| GET | `/api/departments` | List departments | Yes | Any |
| POST | `/api/departments` | Create department | Yes | ADMIN |
| GET | `/api/deadlines` | List deadlines | Yes | Any |
| POST | `/api/deadlines` | Create deadline | Yes | Any (department-limited for FACULTY) |
| GET | `/api/deadlines/{id}` | Get deadline by ID | Yes | Any (department-limited for FACULTY) |
| PATCH | `/api/deadlines/{id}` | Update deadline | Yes | Any (department-limited for FACULTY) |
| DELETE | `/api/deadlines/{id}` | Delete deadline | Yes | Any (department-limited for FACULTY) |
| GET | `/api/notifications` | List notifications | Yes | Any |
| PATCH | `/api/notifications` | Mark notification(s) as read | Yes | Any |
| POST | `/api/notifications` | Register push token | Yes | Any |
| GET | `/api/reminders` | List reminders | Yes | Any |
| POST | `/api/reminders` | Create reminder | Yes | Any |
| PATCH | `/api/reminders` | Update reminder status | Yes | Any |
| GET | `/api/calendar` | List calendar events | Yes | Any |
| POST | `/api/calendar` | Create calendar event | Yes | Any |
| POST | `/api/sync` | Trigger Gmail/Calendar sync | Yes | Any |
| GET | `/api/branding` | Get branding tokens | No | Public |
| GET | `/api/admin/users` | Admin user list | Yes | ADMIN |
| POST | `/api/admin/users/suspend` | Suspend or reinstate user | Yes | ADMIN |
| POST | `/api/admin/promote-hod` | Promote faculty to HOD | Yes | ADMIN |
| POST | `/api/admin/demote-hod` | Demote HOD to faculty | Yes | ADMIN |
| GET | `/api/admin/analytics` | Admin metrics dashboard | Yes | ADMIN |
| GET | `/api/admin/audit-logs` | Audit log feed | Yes | ADMIN |
| GET | `/api/hod/faculty` | Department faculty and deadlines | Yes | HOD or ADMIN |

## Database Schema Documentation

### departments

| Purpose | Columns | Relationships |
| --- | --- | --- |
| Organize faculty and deadlines by department | `id`, `name`, `code`, `created_at`, `updated_at` | 1:N with users, 1:N with deadlines |

### users

| Purpose | Columns | Relationships |
| --- | --- | --- |
| Faculty/admin identity and role data | `id`, `auth_user_id`, `email`, `password_hash`, `full_name`, `employee_id`, `role`, `is_suspended`, `department_id`, `avatar_url`, `created_at`, `updated_at` | N:1 to departments, 1:N to deadlines, notifications, push_tokens, reminders, calendar_events, audit_logs, 1:1 to google_accounts |

### deadlines

| Purpose | Columns | Relationships |
| --- | --- | --- |
| Track academic deadlines | `id`, `title`, `description`, `due_date`, `priority`, `created_by`, `department_id`, `is_completed`, `created_at`, `updated_at` | N:1 to users (created_by), N:1 to departments, 1:N to notifications |

### notifications

| Purpose | Columns | Relationships |
| --- | --- | --- |
| In-app notifications for faculty | `id`, `user_id`, `title`, `body`, `type`, `is_read`, `related_deadline_id`, `created_at` | N:1 to users, optional N:1 to deadlines |

### push_tokens

| Purpose | Columns | Relationships |
| --- | --- | --- |
| Store FCM tokens per device | `id`, `user_id`, `fcm_token`, `platform`, `updated_at` | N:1 to users |

### google_accounts

| Purpose | Columns | Relationships |
| --- | --- | --- |
| Store OAuth tokens and sync preferences | `id`, `user_id`, `google_id`, `access_token`, `refresh_token`, `sync_gmail`, `sync_calendar`, `connected_at`, `updated_at` | 1:1 to users |

### calendar_events

| Purpose | Columns | Relationships |
| --- | --- | --- |
| App and Google calendar events | `id`, `user_id`, `google_event_id`, `title`, `start_time`, `end_time`, `source`, `created_at`, `updated_at` | N:1 to users |

### reminders

| Purpose | Columns | Relationships |
| --- | --- | --- |
| Scheduled reminders for deadlines | `id`, `user_id`, `title`, `description`, `reminder_time`, `status`, `created_at`, `updated_at` | N:1 to users |

### audit_logs

| Purpose | Columns | Relationships |
| --- | --- | --- |
| Admin action auditing | `id`, `admin_id`, `action`, `target_user`, `timestamp` | N:1 to users (admin) |

## Notification Architecture

```mermaid
sequenceDiagram
  participant Faculty
  participant API as DeadlineService
  participant DB as Prisma/Supabase
  participant Notify as NotificationService
  participant FCM
  participant Email as Resend

  Faculty->>API: Create deadline
  API->>DB: Insert deadline
  API->>Notify: notifyDepartment()
  Notify->>DB: Create notification rows
  Notify->>FCM: Send push (tokens)
  Notify->>Email: Send deadline reminder
  FCM-->>Faculty: Push alert
  Email-->>Faculty: Email reminder
```

## Gmail Integration (Planned)

| Aspect | Details |
| --- | --- |
| Purpose | Auto-extract deadlines from institutional emails |
| Flow | Google OAuth -> Gmail read -> heuristic parsing -> create deadlines |
| Security | OAuth access/refresh tokens stored in `google_accounts` |
| Scopes | `gmail.readonly`, `userinfo.email`, `userinfo.profile` |
| Status | Backend sync logic exists; UI and scheduling automation are pending |

## Google Calendar Integration (Planned)

| Aspect | Details |
| --- | --- |
| Purpose | Two-way calendar sync between app and Google Calendar |
| Flow | Fetch Google events -> store local events -> push app events to Google |
| Security | OAuth tokens stored in `google_accounts` |
| Scopes | `calendar` |
| Status | Backend sync logic exists; UI and scheduling automation are pending |

## Security Architecture

| Control | Implementation |
| --- | --- |
| JWT Verification | `verifyAuth()` in `server/src/lib/auth.ts` |
| Protected Routes | `requireAuth()` middleware wrapper |
| Role-Based Access | `requireRoles()` with Role enum |
| Secrets | `.env.example` outlines required secrets |
| RLS Policies | Not defined in repo; should be configured in Supabase for data isolation |

## Environment Variables

| Variable | Purpose | Required | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Prisma connection to Supabase Postgres | Yes | `postgresql://...` |
| `SUPABASE_URL` | Supabase project URL | Yes | `https://project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes | `eyJ...` |
| `JWT_SECRET` | JWT signing key | Yes | `long-random-secret` |
| `RESEND_API_KEY` | Resend email API key | Optional (email disabled if absent) | `re_...` |
| `FIREBASE_PROJECT_ID` | FCM project ID | Optional (push disabled if absent) | `christ-faculty-app` |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Optional | `firebase-adminsdk@...` |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Optional | `-----BEGIN PRIVATE KEY-----...` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional (OAuth disabled if absent) | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Optional | `...` |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | Optional | `http://localhost:3000/api/auth/google/callback` |

## Deployment Architecture

```mermaid
flowchart LR
  FlutterApp["Flutter App (Android/iOS/Web)"] --> APIGW["Next.js API (Vercel)"]
  AdminConsole["Admin Console (Next.js /admin)"] --> APIGW
  APIGW --> Prisma
  Prisma --> SupabaseDB["Supabase Postgres"]
  APIGW --> FCM
  APIGW --> Resend
  APIGW --> GoogleOAuth
```

## Scalability Considerations

| Scale | Primary Bottlenecks | Recommended Improvements |
| --- | --- | --- |
| 1,000 users | Single DB instance, synchronous notification fanout | Add basic caching, index tuning |
| 10,000 users | Notification fanout latency, Gmail/Calendar sync load | Queue-based notification jobs, background workers |
| 50,000 users | API throughput, sync scheduling, DB hot spots | Shard background jobs, rate limiting, read replicas |

## Development Workflow

The repository does not include explicit workflow rules. The following baseline is recommended for consistent collaboration.

| Area | Recommended Practice |
| --- | --- |
| Branching | `main` protected; feature branches per change |
| Pull Requests | Mandatory review, CI checks, clear changelog |
| Coding Standards | Flutter: `flutter_lints`; Backend: TypeScript + Next.js lint |
| Commits | Conventional commits (feat/fix/chore) |

## Future Roadmap

| Phase | Theme | Key Outcomes |
| --- | --- | --- |
| Phase 1 | Core Platform | Auth, deadlines, notifications, department management |
| Phase 2 | Notifications & Admin | Advanced analytics, auditing, richer notification workflows |
| Phase 3 | Gmail Integration | Email parsing, auto-deadline extraction, scheduled sync |
| Phase 4 | Calendar Integration | Two-way calendar sync with Google Calendar |
| Phase 5 | AI Academic Assistant | Intelligent reminders, summarization, workload insights |

## Known Limitations

| Limitation | Impact |
| --- | --- |
| Flutter UI uses mock data in multiple screens | Backend data is not yet wired into all UI views |
| JWT refresh flow is a placeholder in the client | Sessions rely on 7-day JWTs without refresh rotation |
| No background scheduler for reminders | Reminder delivery depends on future worker setup |
| Supabase RLS policies not defined in repo | Data isolation relies on API enforcement |
| Supabase Auth not wired to backend | Local JWT issuance is used instead |

## Architecture Decisions

| Technology | Rationale | Notes |
| --- | --- | --- |
| Flutter | Single codebase across mobile platforms | Uses Riverpod and GoRouter |
| Next.js | Serverless-ready API and admin console | App Router for `/api` routes |
| Prisma | Type-safe DB access and schema-driven modeling | Supabase Postgres provider |
| Supabase Postgres | Managed Postgres with scalable hosting | RLS policies to be configured |
| Firebase Cloud Messaging | Reliable push delivery | Token registry in `push_tokens` |
| Resend | Simplified email delivery | Styled HTML templates for reminders |
| Google OAuth | OAuth for Gmail/Calendar sync | Consent-gated in `google_accounts` |

## Quick Start Guide

### Prerequisites

| Component | Requirement |
| --- | --- |
| Flutter | SDK >= 3.0.0 |
| Node.js | 18+ recommended |
| Supabase | Postgres database and project credentials |

### Backend Setup

1. Install dependencies:
   - `cd server`
   - `npm install`
2. Configure environment:
   - Copy `server/.env.example` to `server/.env`
   - Fill required variables
3. Initialize database:
   - Apply `server/prisma/supabase_setup.sql` in Supabase SQL editor
   - Ensure `DATABASE_URL` points to Supabase
4. Run API:
   - `npm run dev`

### Flutter App Setup

1. Install dependencies:
   - `flutter pub get`
2. Configure API base URL:
   - Update `lib/core/constants/app_constants.dart` as needed
3. Run app:
   - `flutter run`

### Deployment Notes

| Component | Deployment Target | Notes |
| --- | --- | --- |
| Backend | Vercel | Uses Next.js serverless runtime |
| Database | Supabase | Postgres + managed auth potential |
| Flutter | Play Store/TestFlight/Web | Configure API base URL per environment |
