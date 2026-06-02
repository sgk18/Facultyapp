# CHRIST University Faculty App - Official Design System

This is the central specification for the CHRIST Faculty branding and UI design guidelines. All applications, web portals, templates, and documentation pages must conform to this system.

---

## 1. Brand Colors

### Reusable Color Palette

| Name | Hex Value | Purpose |
| :--- | :--- | :--- |
| **Primary Blue** | `#0147AD` | Primary interactive elements, brand signature, highlights |
| **Secondary Background** | `#DCDCDC` | Soft canvas background, card/section borders, silver-grey panels |
| **Surface** | `#FFFFFF` | Cards, buttons foreground, clean content areas |
| **Dark Text** | `#111827` | Headings, primary body readability (Notion-style slate-gray) |
| **Secondary Text** | `#6B7280` | Subtitles, helper text, captions |
| **Success** | `#10B981` | Safe status tags, completion logs, success notifications |
| **Warning** | `#F59E0B` | Pending status alert tags, cautionary notices |
| **Error** | `#EF4444` | High urgency notifications, critical deadline alerts |

---

## 2. Gradient System

### Primary Gradient

```css
linear-gradient(
  135deg,
  #0147AD 0%,
  #1D5FD1 50%,
  #4A84F0 100%
)
```

**Use cases:**
- Login page headers and splash screens
- Main dashboard highlight banners
- Empty state illustrations and call-to-actions
- System loading hero banners

---

## 3. Typography Recommendations

The brand system targets a clean, modern academic feeling. It borrows aesthetics from Notion and Linear:
- **Headings & Title Text:** **Outfit** (vibrant, modern geometric sans-serif)
- **Body & Secondary Copy:** **Inter** (highly readable, professional sans-serif)

---

## 4. Component Styling Guidelines

### Cards
- **Border Radius:** `16px`
- **Background:** Surface White (`#FFFFFF`) or transparent glass with opacity
- **Border:** `1px solid rgba(226, 232, 240, 0.8)`
- **Shadow:** Soft subtle shadow (`0px 4px 16px rgba(0, 0, 0, 0.04)`)

### Buttons
- **Primary Color:** `#0147AD`
- **Text Color:** `#FFFFFF`
- **Border Radius:** `12px`
- **Padding:** Elegant padding (e.g., `14px 28px` or `16px 24px`)

### Input Fields
- **Background:** White (`#FFFFFF`)
- **Border:** Clean light border (`1.5px solid #E2E8F0`)
- **Focus Border:** Brand Primary Blue (`#0147AD`) with focus ring
- **Border Radius:** `12px`

### Navigation Bar
- **Background:** White (`#FFFFFF`)
- **Active Indicators:** Brand Primary Blue (`#0147AD`)

---

## 5. Email Template Specifications

All automated notifications and emails sent by the server must maintain consistent styling:

- **Email Header Background:** `#0147AD`
- **Email Body Background:** `#FFFFFF`
- **Email Footer Background:** `#DCDCDC`
- **Email Text Color:** `#111827`
- **Interactive Action Buttons:** `#0147AD` with White text and `12px` border radius

---

## 6. Notification Categories

| Category | Color | Usage |
| :--- | :--- | :--- |
| **INFO** | `#0147AD` | Policy updates, general schedules, calendar invites |
| **SUCCESS** | `#10B981` | Submissions received, approvals completed, grade entries |
| **WARNING** | `#F59E0B` | Upcoming review deadlines, draft statuses |
| **ERROR** | `#EF4444` | Immediate attention required, past due warnings |
