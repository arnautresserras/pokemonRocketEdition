export function categoryLabel(cat: string): string {
  if (cat === 'todos') return 'Todos'
  if (cat === 'cambios') return 'Cambios'
  if (cat.includes('PIEDRAS EVOLUTIVAS')) return 'Piedras Evol.'
  if (cat.includes('POTENCIADORES DE CIERTOS')) return 'Potenciadores'
  if (cat.includes('COMPETITIVOS')) return 'Competitivos'
  if (cat.includes('+20%')) return '+20% Tipo'
  if (cat.includes('TABLAS DE ARCEUS')) return 'Tablas Arceus'
  if (cat.includes('MEGAPIEDRAS NUEVAS')) return 'Mega Nuevas'
  if (cat.includes('MEGAPIEDRAS')) return 'Megapiedras'
  if (cat.includes('BAYAS REDUCTORAS')) return 'Bayas EVs'
  if (cat.includes('BAYAS MITIGADORAS')) return 'Bayas Combat.'
  if (cat.includes('GEMAS')) return 'Gemas'
  if (cat.includes('CRISTALES')) return 'Cristales Z'
  if (cat.includes('SEMILLAS')) return 'Semillas'
  if (cat.includes('DISCOS DE GENESECT')) return 'Discos Genesect'
  if (cat.includes('DISCOS DE SILVALLY')) return 'Discos Silvally'
  return cat.split(' ').slice(0, 2).join(' ')
}
