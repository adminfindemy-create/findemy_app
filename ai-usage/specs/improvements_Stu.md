# Findemy Student App — Production Grade MVP Refactor & Implementation

## Project Context

You are working on `student.html`, which currently contains a static prototype of the Findemy student application.

The prototype already includes:
- Shared design tokens
- Inlined CSS system
- Multiple mobile screens
- Basic navigation
- Existing academy/event/profile flows

Your task is to transform this prototype into a **production-quality mobile-first frontend implementation** aligned with the latest app screenshots and MVP scope.

The implementation should not feel like a design prototype anymore.

It should feel:
- Production-ready
- Scalable
- Clean
- Responsive
- Mobile-native
- Modular
- Maintainable

---

# Product Vision

Findemy is a modern learning marketplace where students can:
- Discover academies
- Explore workshops/events
- Book trial classes
- Manage enrollments
- Track upcoming sessions

The app should feel:
- Fast
- Trustworthy
- Youthful
- Minimal
- Premium but approachable

---

# Core MVP Scope

## Included

- Authentication system
- Signup onboarding
- Explore/Home
- Search & filters
- Academy details
- Batch booking
- Events
- Profile management
- Trial management
- Compare academies
- Persistent user session

---

## Excluded From MVP

The following must NOT be implemented:

### Remove Completely
- Reels feed
- Create reel flow
- Leaderboard system
- Social feed interactions
- Floating reel FAB

### Remove Related Components
- `.s-reels`
- `.s-create`
- leaderboard cards
- reel actions
- reel navigation tab

---

# Technical Expectations

The final implementation must be structured like a production frontend system.

---

# Architecture Requirements

## Refactor Into Modular Sections

Even if the project remains single-file for now, structure the codebase as if it will later migrate to React/Next.js.

Separate logically into:

- Design Tokens
- Utility Classes
- Shared Components
- Layout System
- Screen-Specific Styles
- Mock Data Layer
- State Management Layer
- Navigation Layer
- Auth Logic Layer

---

# Componentization Requirements

Refactor duplicated UI into reusable components.

## Required Reusable Components

- `BottomNav`
- `SearchBar`
- `CategoryPills`
- `AcademyCard`
- `AcademyHero`
- `BatchCard`
- `EventCard`
- `OTPInput`
- `ProfileStats`
- `PrimaryButton`
- `GhostButton`
- `EmptyState`
- `Modal`
- `Toast`
- `Loader`

---

# Design System Requirements

## Continue Using Existing Tokens

Use the existing token system already defined inside `student.html`.

### Core Tokens

```css
--persimmon: #D8492A;
--paper: #F1ECE2;
--ink: #14110F;
--sans: 'Geist';
--serif: 'Instrument Serif';
```

---

# Visual Direction

The current prototype is visually too editorial/heavy.

The production app should instead feel:

> “Minimal modern learning marketplace”

---

# Reduce

- Decorative gradients
- Textures
- Heavy serif typography
- Large shadows
- Excessive ornamentation

---

# Increase

- Whitespace
- Flat surfaces
- Simpler cards
- Native mobile feel
- Consistent spacing
- Clear hierarchy

---

# Typography Rules

## Production Typography

### Use Sans-serif For
- Navigation
- Cards
- Buttons
- Inputs
- Body text
- Metadata

### Use Serif Sparingly For
- Hero accents
- Marketing emphasis only

---

# Mobile UX Requirements

The implementation MUST behave like a real mobile application.

---

# Required Mobile Behaviors

- Safe-area support
- Keyboard-safe auth screens
- Momentum scrolling
- Sticky bottom nav
- Sticky CTAs
- Touch feedback
- Responsive spacing
- Native-feeling transitions

---

# Performance Requirements

The app must be optimized for production-level frontend performance.

---

# Optimize

- DOM structure
- CSS specificity
- Render cycles
- Scroll performance
- Animation performance
- Layout shifts

---

# Avoid

- Large nested DOM trees
- Heavy box shadows
- Excessive blur effects
- Expensive animations
- Layout thrashing

---

# Accessibility Requirements

The app MUST meet production accessibility standards.

---

# Required Accessibility Features

- Semantic HTML
- Proper heading hierarchy
- ARIA labels where needed
- Focus states
- Keyboard navigation
- Proper contrast ratios
- Correct touch target sizes

---

# Responsive Requirements

Primary target:
- Mobile devices

Secondary support:
- Tablet responsive scaling

---

# Layout Rules

- Mobile-first only
- Do NOT design desktop layouts
- Keep consistent screen padding
- Respect bottom safe area
- Maintain proper vertical rhythm

---

# Authentication System

# Login Screen

## Requirements

Create a modern minimal login screen.

---

## Layout

### Heading
- “Findemy”
- Large bold sans-serif

### Subtitle
“Book trial classes at top academies”

---

## Login Methods

### Required Options
- Continue with Google
- Continue with Apple
- Continue with Phone

---

## Button Styling

### Apple
- Black filled pill button

### Google / Phone
- Ghost/text buttons

---

## Footer

“New here? Create an account”

---

# Signup Screen

## Requirements

Implement a dedicated signup screen.

---

## Features

- Back navigation
- Create account heading
- Social auth options
- Phone auth option
- Existing user login redirect

---

# Phone Authentication

## Requirements

- Country picker
- +91 default
- Numeric keyboard
- Validation states
- Error handling
- Keyboard-safe layout

---

# OTP Verification

## Features

- 6 OTP cells
- Auto-focus
- Paste support
- Auto-submit
- Verify CTA
- Resend timer

---

# Error Handling

Implement:
- Invalid OTP
- Expired OTP
- Network failure
- Empty input validation

---

# Session Persistence

Use:
- localStorage
- sessionStorage

Persist:
- Auth state
- User profile
- Onboarding completion
- Selected interests

---

# User Flows

## Returning User
Login → Explore

## New User
Login → Onboarding → Explore

---

# Interest Onboarding

## Categories

- Music
- Dance
- Arts
- Yoga
- Fitness
- Singing
- Theatre
- Instruments
- Painting

---

## Features

- Multi-select support
- Continue CTA
- Dynamic chip states
- Smooth transitions

---

# Explore / Home Screen

This is the primary app experience.

---

# Header

## Requirements

Display:
- Greeting
- Dynamic user name
- User avatar

Example:
“Good afternoon, Varun.”

---

# Search Bar

## Features

- Search academies
- Filter button

---

## Requirements

- Full-width
- Rounded
- Native mobile feel

---

# Category Pills

## Categories

- All
- Music
- Dance
- Arts
- Yoga

---

## Behavior

- Horizontal scroll
- Active state
- Smooth interactions

---

# Top Rated Section

## Layout

Two-column responsive academy grid.

---

# Academy Card Requirements

Each card must include:
- Placeholder image
- Category badge
- Rating chip
- Academy name
- Address
- Trial Free label

---

# Improve

- Card consistency
- Typography hierarchy
- Image ratio
- Vertical spacing

---

# Near You Section

## Layout

Single large academy card.

---

# Features

- Compare CTA
- Trial label
- Address
- Academy metadata

---

# Academy Details Page

Requires significant refinement.

---

# Hero Section

## Features

- Flat soft background
- Academy category
- Academy name
- Ratings
- Address
- Mentor info

---

# Map Section

Implement:
- Embedded placeholder map
- “Apple Maps | Legal”

---

# Tabs

## Required Tabs

- Batches
- Workshops
- Reviews

---

# Tab Behavior

- Sticky tabs
- Active underline
- Smooth transitions

---

# Batch Cards

## Each Card Must Include

- Batch title
- Skill level
- Price
- Duration
- Schedule
- Book Trial CTA

---

# Book Trial Flow

Implement or verify:

1. Slot picker
2. Booking confirmation
3. Booking success
4. Trial detail screen

---

# Events Module

Simplify current events implementation.

---

# Header

“What’s on”

- “on” highlighted in persimmon

---

# Event Categories

- All
- Competitions
- Workshops
- Meetups

---

# Event Cards

Simple clean cards with:
- Event type
- Event title
- Location

---

# Remove

- Spotlight cards
- Decorative event gradients
- Heavy visual styling

---

# Profile Module

Simplify and productionize current profile implementation.

---

# Header

## Features

- Dark hero section
- Avatar
- User name
- City
- Explorer badge

---

# Stats

Display:
- Trials
- Enrolled
- Reviews

---

# Sections

- Upcoming trials
- Past trials
- My classes
- Interests

---

# Interests

Editable chip-based UI.

---

# Logout

Large rounded CTA button.

---

# Compare Academies

## Features

Allow users to:
- Add academies
- Compare academies side-by-side

---

# Comparison Data

- Ratings
- Pricing
- Trial availability
- Location
- Batch types

---

# State Management

Implement lightweight frontend state handling.

---

# Required State

- Active tabs
- Search
- Filters
- OTP flow
- Auth state
- Compare list
- User profile
- Selected interests

---

# Mock Data Layer

Create reusable mock JSON datasets for:
- Academies
- Events
- Reviews
- User profile
- Batch schedules

Avoid repeated hardcoded HTML blocks.

---

# Animation Requirements

Animations should feel:
- Fast
- Subtle
- Native

---

# Include

- Button press states
- Tab transitions
- Card hover/tap states
- Input focus transitions

---

# Avoid

- Excessive motion
- Heavy parallax
- Large transition delays

---

# Navigation Requirements

## Final Bottom Navigation

ONLY 3 tabs:

1. Explore
2. Events
3. Profile

---

# Remove

- Reels tab
- Floating FAB
- 5-column nav

---

# Empty States

Production-quality empty states required for:

- No trials
- No enrollments
- No reviews
- No search results
- No events

---

# Error States

Implement:
- Offline state
- Auth failure
- Empty API response
- Loading skeletons

---

# Loading States

Add:
- Skeleton loaders
- Button loading indicators
- Page transition loading

---

# Code Quality Requirements

## Code Must Be

- Clean
- Readable
- Reusable
- Well-commented
- Production structured

---

# Avoid

- Inline styles
- Repeated CSS
- Hardcoded layouts
- Deep selector nesting

---

# Future Scalability

The implementation should be easy to migrate later into:
- React
- Next.js
- Tailwind
- Component libraries

Structure the code accordingly.

---

# Final Deliverable Expectations

The final implementation should:

- Match provided screenshots closely
- Feel production-ready
- Be visually consistent
- Be mobile-native
- Be performant
- Be scalable
- Be maintainable
- Be MVP-ready

---

# Final Product Feel

The app should feel like:
- Airbnb for learning academies
- Modern Indian edtech marketplace
- Mobile-first consumer product

It should NOT feel like:
- A design prototype
- A dribbble concept
- A static mockup
- An over-designed luxury site
```