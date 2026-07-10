const TABLE: Record<string, string> = {
  "music-beginner": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&q=80&auto=format",
  "music-intermediate": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&q=80&auto=format",
  "music-advanced": "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&q=80&auto=format",
  "dance-beginner": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80&auto=format",
  "dance-intermediate": "https://images.unsplash.com/photo-1535525153412-5a092d46ce4a?w=600&q=80&auto=format",
  "dance-advanced": "https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=600&q=80&auto=format",
  "arts-beginner": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80&auto=format",
  "arts-intermediate": "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=600&q=80&auto=format",
  "arts-advanced": "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=600&q=80&auto=format",
  "yoga-beginner": "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80&auto=format",
  "yoga-intermediate": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&q=80&auto=format",
  "yoga-advanced": "https://images.unsplash.com/photo-1593810450967-f9c42742e326?w=600&q=80&auto=format",
};

const CATEGORY_FALLBACK: Record<string, string> = {
  music: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80&auto=format",
  dance: "https://images.unsplash.com/photo-1535525153412-5a092d46ce4a?w=600&q=80&auto=format",
  arts: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80&auto=format",
  yoga: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80&auto=format",
  fitness: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80&auto=format",
};

const GENERIC_FALLBACK =
  "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600&q=80&auto=format";

export function getProgramImage(category: string, level: string): string {
  const c = (category ?? "").toLowerCase();
  const l = (level ?? "").toLowerCase();
  return TABLE[`${c}-${l}`] ?? CATEGORY_FALLBACK[c] ?? GENERIC_FALLBACK;
}
