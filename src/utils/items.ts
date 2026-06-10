const CATEGORY_LABELS: Record<string, string> = {
  todos: 'Todos',
  cambios: 'Cambios',
  'PIEDRAS EVOLUTIVAS': 'Piedras Evol.',
  'OBJETOS POTENCIADORES DE CIERTOS PKMN': 'Potenciadores',
  'OBJETOS COMPETITIVOS': 'Competitivos',
  'UBICACIÓN OBJETOS POTENCIADORES +20% UN TIPO CONCRETO': '+20% Tipo',
  'UBICACIÓN DE LAS TABLAS DE ARCEUS (+30% UN TIPO CONCRETO)': 'Tablas Arceus',
  'DISCOS DE GENESECT': 'Discos Genesect',
  'DISCOS DE SILVALLY': 'Discos Silvally',
  'BAYAS REDUCTORAS EVS': 'Bayas EVs',
  'BAYAS MITIGADORAS SUPEREFECTIVO Y BAYAS QUE SUBEN UN STAT EN MOMENTO CRÍTICO': 'Bayas Combat.',
  'GEMAS PKMN': 'Gemas',
  'CRISTALES Z': 'Cristales Z',
  'SEMILLAS CONSUMIBLES BAJO CAMPOS': 'Semillas',
  'TODAS LAS MEGAPIEDRAS (OFICIALES)': 'Megapiedras',
  'MEGAPIEDRAS NUEVAS': 'Mega Nuevas',
}

export function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat
}
