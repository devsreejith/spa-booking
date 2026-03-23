# Architecture Quality

This document summarizes architecture and quality characteristics of the SPA Booking UI, with a focus on how the codebase behaves under load, manages state, and maintains responsiveness.

## Performance Under Load

- Virtualizes therapist columns with `react-window` to keep DOM size bounded even with 200+ therapists ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx)).
- Uses stress-test data in the mock backend (2,000 bookings/day + 200 therapists) to validate rendering behavior ([mockBackend.js](spa-booking-system/src/api/mockBackend.js)).
- Derives “render-ready” bookings (pixel `top`/`height`) in a memoized map keyed by therapist to avoid recomputing layout on every render ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx)).
- Reduces unnecessary re-renders with `React.memo` for booking blocks and list items ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx)).
- Caches data by date in both the mock API (`dailyCache`) and the store (`bookingsByDate`) to avoid refetching and re-generating data for previously visited dates ([mockBackend.js](spa-booking-system/src/api/mockBackend.js), [useBookingStore.js](spa-booking-system/src/store/useBookingStore.js)).
- Keeps time updates lightweight by updating “now” at a 60-second interval (not continuously) and only rendering the time indicator within the visible calendar range ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx)).

## State Management Strategy

- Uses a single Zustand store for shared application state: bookings, therapists, selected booking, sidebar mode, loading/error, and UI toasts ([useBookingStore.js](spa-booking-system/src/store/useBookingStore.js)).
- Normalizes bookings into a date-keyed index (`bookingsByDate`) for efficient lookups and fast updates after mutations ([useBookingStore.js](spa-booking-system/src/store/useBookingStore.js)).
- Implements optimistic updates for create/delete/update flows, then reconciles with the mock backend result; errors rollback optimistic state ([useBookingStore.js](spa-booking-system/src/store/useBookingStore.js)).
- Keeps form state local to the sidebar (`formData`) while persisting confirmed results in the global store ([Sidebar.jsx](spa-booking-system/src/components/Sidebar/Sidebar.jsx)).
- Adds a small, global toast state for user feedback on create/delete actions, rendered at the app shell level ([useBookingStore.js](spa-booking-system/src/store/useBookingStore.js), [App.jsx](spa-booking-system/src/App.jsx)).

## Code Structure

- `src/App.jsx` provides the app shell (header, search, date navigation) and lazy-loads feature areas with `Suspense` ([App.jsx](spa-booking-system/src/App.jsx)).
- `src/components/CalendarBoard/` contains the main calendar rendering, virtualization, drag interactions, and time-grid logic ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx), [CalendarBoard.css](spa-booking-system/src/components/CalendarBoard/CalendarBoard.css)).
- `src/components/Sidebar/` contains booking view/edit/create UI and cancellation flows ([Sidebar.jsx](spa-booking-system/src/components/Sidebar/Sidebar.jsx)).
- `src/store/useBookingStore.js` centralizes business logic (fetching, indexing, optimistic mutation, UI state) so components can stay primarily declarative.
- `src/api/mockBackend.js` provides a deterministic, latency-injected API surface that approximates production behaviors (fetch delay, mutation delay, caching) for UI realism and load testing.

## Error Handling

- Store exposes `error` state and sets it on failures for fetch/mutation flows; UI can render error banners in the shell ([useBookingStore.js](spa-booking-system/src/store/useBookingStore.js), [App.jsx](spa-booking-system/src/App.jsx)).
- Mutations are wrapped in `try/catch` with rollback behavior to prevent corrupt UI state when API calls fail ([useBookingStore.js](spa-booking-system/src/store/useBookingStore.js)).
- Operational telemetry is captured through `logEvent`/`logError`, capped to a small recent buffer to prevent unbounded growth ([logger.js](spa-booking-system/src/utils/logger.js)).
- UI surfaces actionable feedback for create/delete outcomes via toast messages (success and error) ([Sidebar.jsx](spa-booking-system/src/components/Sidebar/Sidebar.jsx), [App.jsx](spa-booking-system/src/App.jsx)).

## UI Responsiveness

- Horizontal virtualization keeps scrolling smooth by rendering only visible therapist columns ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx)).
- Uses `ResizeObserver` to adapt layout without expensive polling and to keep the calendar responsive to container size changes ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx)).
- Synchronizes time column scrolling with the booking grid to prevent “desynced” vertical scroll experiences ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx)).
- Displays lightweight skeleton booking blocks during horizontal scroll to avoid a blank “loading gap” while virtualization catches up ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx), [CalendarBoard.css](spa-booking-system/src/components/CalendarBoard/CalendarBoard.css)).
- Applies consistent pointer affordances for buttons (including disabled states) at the global CSS level ([index.css](spa-booking-system/src/index.css)).

## Problem-Solving Approach

- Reproduce issues using realistic latency and large data volume from the mock backend before changing UI behavior ([mockBackend.js](spa-booking-system/src/api/mockBackend.js)).
- Prefer targeted changes in hot paths (virtualized list item rendering, derived booking layout, scroll sync) to avoid broad refactors that risk regressions ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx)).
- Use memoization and virtualization first for performance symptoms; add UX affordances (skeletons, toasts) where latency is user-visible ([CalendarBoard.jsx](spa-booking-system/src/components/CalendarBoard/CalendarBoard.jsx), [App.jsx](spa-booking-system/src/App.jsx)).
- Validate changes with lint/build to ensure correctness and keep the codebase shippable.
