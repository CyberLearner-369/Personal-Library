/**
 * The app's signature element: every book gets a deterministic "spine"
 * colour drawn from a palette of classic cloth-binding shades, derived
 * from its title. Shelves of cards read like shelves of books.
 */
const SPINE_COLORS = [
  '#0f766e', // viridian buckram
  '#9a3412', // brick
  '#1e40af', // library blue
  '#6d28d9', // plum
  '#a16207', // ochre
  '#155e75', // slate teal
  '#86198f', // mulberry
  '#3f6212', // moss
] as const;

/** Chart palette reuses the binding colours so data viz matches the shelf. */
export const CHART_COLORS: readonly string[] = SPINE_COLORS;

export function spineColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return SPINE_COLORS[hash % SPINE_COLORS.length];
}
