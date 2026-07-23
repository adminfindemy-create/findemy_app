// Stock images for workshops, events, competitions, meetups.
// Curated Unsplash photos keyed by the item's `type` field.

const WORKSHOP_BY_TYPE: Record<string, string> = {
  masterclass:
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80&auto=format',
  online: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=600&q=80&auto=format',
  offline: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&q=80&auto=format',
  demo: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&q=80&auto=format',
};

const EVENT_BY_TYPE: Record<string, string> = {
  competition:
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600&q=80&auto=format',
  talent_hunt:
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80&auto=format',
  reel_battle:
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&q=80&auto=format',
  meetup: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&q=80&auto=format',
  workshop: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80&auto=format',
};

const GENERIC =
  'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=600&q=80&auto=format';

export function getWorkshopImage(type?: string): string {
  if (!type) return GENERIC;
  return WORKSHOP_BY_TYPE[type] ?? GENERIC;
}

export function getEventImage(type?: string): string {
  if (!type) return GENERIC;
  return EVENT_BY_TYPE[type] ?? GENERIC;
}
