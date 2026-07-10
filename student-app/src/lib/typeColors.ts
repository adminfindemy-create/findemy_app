// Shared workshop "type" tag palette. Single source of truth for the
// masterclass/offline/online/demo chip colors used across bookings,
// the workshop detail screen, and the booking detail sheet.
export type WorkshopTypeColor = { bg: string; fg: string };

export const WORKSHOP_TYPE_COLORS: Record<string, WorkshopTypeColor> = {
  masterclass: { bg: "#FBE3D8", fg: "#A0331F" },
  offline:     { bg: "#FBE4B8", fg: "#5B3F0E" },
  online:      { bg: "#D8E6E1", fg: "#0E3936" },
  demo:        { bg: "#E2DBCC", fg: "#3A332D" },
};
