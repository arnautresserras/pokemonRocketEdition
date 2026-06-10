export function getEffectiveTotal(p: {
  officialStats?: { total: number }
  hackromStats?: { total: number }
}): number {
  return p.hackromStats?.total ?? p.officialStats?.total ?? 0
}
