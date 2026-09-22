export function shouldSeedExperts(
  isAuthenticated: boolean,
  existingSlugs: string[],
  seedSlugs: string[]
) {
  if (!isAuthenticated) return false;
  if (existingSlugs.length > 0) return false;

  const existingSlugSet = new Set(existingSlugs);
  return seedSlugs.some((slug) => !existingSlugSet.has(slug));
}
