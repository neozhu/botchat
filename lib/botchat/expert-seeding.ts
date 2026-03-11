export function shouldSeedExperts(
  isAuthenticated: boolean,
  existingSlugs: string[],
  seedSlugs: string[]
) {
  if (!isAuthenticated) return false;

  const existingSlugSet = new Set(existingSlugs);
  return seedSlugs.some((slug) => !existingSlugSet.has(slug));
}
