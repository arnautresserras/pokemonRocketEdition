import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Move, Item, MT, ItemChange, RegionGuide, GuideSection, Battle, PokemonEncounter, Pokemon, Stats } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DOCS_DIR = path.join(__dirname, '../docs')
const DATA_DIR = path.join(__dirname, '../src/data')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

function readDoc(predicate: (name: string) => boolean): string {
  const files = fs.readdirSync(DOCS_DIR)
  const file = files.find(predicate)
  if (!file) throw new Error(`Doc not found: ${predicate.toString()}`)
  return fs.readFileSync(path.join(DOCS_DIR, file), 'utf8')
}

// ── Moves ─────────────────────────────────────────────────────────────────────

function parseMoves() {
  const content = readDoc(f => f.includes('MOVIMIENTOS'))

  const moves: Move[] = []
  const blocks = content.split(/\n-{3,}\n/)

  for (let i = 0; i < blocks.length - 1; i += 2) {
    const namePart = blocks[i]
    const body = blocks[i + 1] ?? ''

    const name = namePart.split('\n').map(l => l.trim()).filter(Boolean).pop()
    if (!name) continue

    const parseVersion = (block: string, label: string) => {
      const typeM = block.match(new RegExp(`${label} \\(Tipo ([^)]+)\\)`))
      const power = block.match(/Potencia - (.+)/)?.[1]?.trim() ?? ''
      const accuracy = block.match(/Precisi[oó]n - (.+)/)?.[1]?.trim() ?? ''
      const effect = block.match(/Ef\.Secundario - (.+)/)?.[1]?.trim() ?? ''
      const pp = parseInt(block.match(/PP - (\d+)/)?.[1] ?? '0')
      return { type: typeM?.[1]?.trim() ?? '', power, accuracy, effect, pp }
    }

    const oficialIdx = body.indexOf('Oficial')
    const hackromIdx = body.indexOf('Hackrom')
    if (oficialIdx === -1 || hackromIdx === -1) continue

    const oficialBlock = body.slice(oficialIdx, hackromIdx)
    const hackromBlock = body.slice(hackromIdx)

    moves.push({
      name,
      official: parseVersion(oficialBlock, 'Oficial'),
      hackrom: parseVersion(hackromBlock, 'Hackrom'),
    })
  }

  return moves
}

// ── Pokemon stats ─────────────────────────────────────────────────────────────

function parseStats(content: string): ParsedPokemonStats[] {
  const statsRegex =
    /(Oficial|Hackrom): Ps (\d+), At (\d+), Def (\d+), At\.esp (\d+), Def\.esp (\d+), Velocid (\d+)\. Total (\d+)/

  const result: ParsedPokemonStats[] = []

  const lines = content.split('\n')
  let currentName = ''
  let officialStats: Stats | undefined
  let hackromStats: Stats | undefined
  let abilities: string[] = []
  let hackromTypes: string[] | undefined

  const flush = () => {
    if (currentName) {
      result.push({ name: currentName, officialStats, hackromStats, abilities, hackromTypes })
    }
    officialStats = undefined
    hackromStats = undefined
    abilities = []
    hackromTypes = undefined
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const statsMatch = line.match(statsRegex)
    if (statsMatch) {
      const s = {
        hp: +statsMatch[2],
        attack: +statsMatch[3],
        defense: +statsMatch[4],
        spAttack: +statsMatch[5],
        spDefense: +statsMatch[6],
        speed: +statsMatch[7],
        total: +statsMatch[8],
      }
      if (statsMatch[1] === 'Oficial') officialStats = s
      else hackromStats = s
      continue
    }

    const abilityMatch = line.match(/Habilidades?: (.+)/)
    if (abilityMatch) {
      abilities = abilityMatch[1].split('/').map(a => a.trim())
      continue
    }

    const hackromTypeMatch = line.match(/^Tipo Hackrom: (.+)/)
    if (hackromTypeMatch) {
      hackromTypes = hackromTypeMatch[1].split('/').map(t => t.trim())
      continue
    }

    // If it looks like a Pokémon name header (all caps or title with caps)
    if (/^[A-ZÁÉÍÓÚÑÜ\s\-'\.0-9]+$/.test(line) && line.length < 60) {
      flush()
      currentName = line
    }
  }
  flush()

  return result
}

// ── Experiments (Prototypes & Megas) ─────────────────────────────────────────

function parseExperiments(): Pokemon[] {
  const experimentContent = readDoc(f => f.includes('Experimentos'))
  const megaContent = readDoc(f => f.includes('Megaevoluciones'))

  const result: Pokemon[] = []

  const parseBlock = (content: string, category: string, level?: number) => {
    const formNameRe = /^([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü\s\-'\.0-9]+):?$/

    const lines = content.split('\n')
    let currentEntry: Record<string, unknown> = {}

    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue

      const statsM = line.match(
        /(?:(.+?)):? Ps (\d+), At (\d+), Def (\d+), At\.esp (\d+), Def\.esp (\d+), Velocid (\d+)\. Total:? (\d+)/,
      )
      if (statsM) {
        const label = statsM[1]?.trim() ?? ''
        const stats = {
          hp: +statsM[2],
          attack: +statsM[3],
          defense: +statsM[4],
          spAttack: +statsM[5],
          spDefense: +statsM[6],
          speed: +statsM[7],
          total: +statsM[8],
        }
        const lowerLabel = label.toLowerCase()
        if (lowerLabel.includes('oficial')) {
          currentEntry.officialStats = stats
        } else if (lowerLabel.includes('hackrom')) {
          currentEntry.hackromStats = stats
        } else {
          currentEntry.hackromStats = stats
        }
        continue
      }

      const typeM = line.match(/Tipo: ([^|]+)\|?\s*Habilidad: (.+)/)
      if (typeM) {
        currentEntry.types = typeM[1].trim().split('/').map(t => t.trim())
        currentEntry.abilities = [typeM[2].trim()]
        continue
      }

      const nameM = line.match(formNameRe)
      if (nameM && line.endsWith(':')) {
        if (currentEntry.name && (currentEntry.officialStats || currentEntry.hackromStats)) {
          result.push({ ...currentEntry, category, prototypeLevel: level } as Pokemon)
        }
        currentEntry = { name: line.replace(/:$/, '').trim() }
      }
    }

    if (currentEntry.name && (currentEntry.officialStats || currentEntry.hackromStats)) {
      result.push({ ...currentEntry, category, prototypeLevel: level } as Pokemon)
    }
  }

  // Parse experiments by level sections
  const level1Idx = experimentContent.indexOf('PROTOTIPOS DE NIVEL I')
  const level2Idx = experimentContent.indexOf('PROTOTIPOS DE NIVEL II')
  const level3Idx = experimentContent.indexOf('PROTOTIPOS DE NIVEL III')

  if (level1Idx !== -1)
    parseBlock(
      experimentContent.slice(level1Idx, level2Idx !== -1 ? level2Idx : undefined),
      'prototype',
      1,
    )
  if (level2Idx !== -1)
    parseBlock(
      experimentContent.slice(level2Idx, level3Idx !== -1 ? level3Idx : undefined),
      'prototype',
      2,
    )
  if (level3Idx !== -1) parseBlock(experimentContent.slice(level3Idx), 'prototype', 3)

  parseBlock(megaContent, 'mega')

  return result
}

// ── Pokemon locations ─────────────────────────────────────────────────────────

function parseLocations(): ParsedLocation[] {
  const content = readDoc(f => f.includes('TODOS') && f.includes('PKMN') && !f.includes('EVOLUC'))
  const result: ParsedLocation[] = []

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    // Format: NAME - NUMBER - description (description may be empty)
    const m = line.match(/^([A-ZÁÉÍÓÚÑÜa-záéíóúñü_'\s]+) - (\d+) - ?(.*)/)
    if (m) {
      result.push({
        name: m[1].trim(),
        dexNumber: +m[2],
        location: m[3].trim() || undefined,
      })
    }
  }

  return result
}

// ── Evolutions ────────────────────────────────────────────────────────────────

function parseEvolutions(): ParsedEvolution[] {
  const content = readDoc(f => f.includes('EVOLUC'))
  const result: ParsedEvolution[] = []

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('NOTA') || line.startsWith('---')) continue

    // Format: FROM a TO (y viceversa) - METHOD
    const m = line.match(/^(.+?) a (.+?)(?:\s+\(y viceversa\))?\s+-\s+(.+)/)
    if (m) {
      result.push({
        from: m[1].trim(),
        to: m[2].trim(),
        method: m[3].trim(),
        bidirectional: line.includes('y viceversa'),
      })
    }
  }

  return result
}

// ── Items ─────────────────────────────────────────────────────────────────────

function parseItems(): Item[] {
  const content = readDoc(f => f.includes('OBJETOS') && !f.includes('CAMBIOS'))
  const result: Item[] = []

  let currentCategory = ''
  let currentItem: Item | null = null
  let groupBullets: string[] = []
  let hasIndividualItems = false

  const flushItem = () => {
    if (currentItem) result.push(currentItem)
    currentItem = null
  }

  const flushGroup = () => {
    if (currentCategory && !hasIndividualItems && groupBullets.length > 0) {
      result.push({
        name: currentCategory,
        category: currentCategory,
        description: groupBullets.join('\n'),
        isGroup: true,
      })
    }
    groupBullets = []
    hasIndividualItems = false
  }

  const isCategoryHeader = (line: string) =>
    line === line.toUpperCase() &&
    line.length > 3 &&
    !line.includes(':') &&
    /[A-ZÁÉÍÓÚÑÜ]/.test(line)

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    // Stop at MT section
    if (line.startsWith('OBTENCIÓN DE TODAS LAS MTS')) {
      flushItem()
      flushGroup()
      break
    }

    // Separator lines
    if (/^-{3,}/.test(line)) continue

    // Category headers
    if (isCategoryHeader(line)) {
      flushItem()
      flushGroup()
      currentCategory = line
      continue
    }

    // Skip "Nota:" lines
    if (/^Nota:/.test(line)) continue

    // Bullet/continuation (must precede item regex — bullets can contain colons)
    if (line.startsWith('-')) {
      if (currentItem) {
        currentItem.description += '\n' + line
      } else {
        groupBullets.push(line)
      }
      continue
    }

    // Item line: "ItemName: description"
    const itemM = line.match(/^([^:]+): (.+)/)
    if (itemM) {
      flushItem()
      hasIndividualItems = true
      currentItem = {
        name: itemM[1].trim(),
        category: currentCategory,
        description: itemM[2].trim(),
      }
      continue
    }

    // Other text (continuation or region notes)
    if (currentItem) {
      currentItem.description += '\n' + line
    } else if (currentCategory) {
      groupBullets.push(line)
    }
  }
  flushItem()
  flushGroup()

  return result
}

// ── MTs ───────────────────────────────────────────────────────────────────────

function parseMTs(): MT[] {
  const content = readDoc(f => f.includes('OBJETOS') && !f.includes('CAMBIOS'))

  const mtSectionIdx = content.indexOf('OBTENCIÓN DE TODAS LAS MTS')
  if (mtSectionIdx === -1) return []

  const mtSection = content.slice(mtSectionIdx)
  const result: MT[] = []

  for (const raw of mtSection.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    // Range: "MT163 a MT165 - No obtenibles." or "MT196 y MT197 - No obtenibles."
    if (/^MT\d+\s+[ay]\s+MT\d+\s*-\s*No obtenible/i.test(line)) continue

    // Single not obtainable: "MT161 - No obtenible."
    if (/^MT\d+\s*-\s*No obtenible/i.test(line)) continue

    // Normal: "MT01 - Puño certero: Quinta planta de Silph. (T1: Kanto)"
    const m = line.match(/^(MT\d+)\s*-\s*(.+?):\s*(.+)$/)
    if (m) {
      const rest = m[3].trim()
      const regionM = rest.match(/(\(T\d+:[^)]+\))\s*$/)
      const region = regionM ? regionM[1] : ''
      const location = rest.replace(regionM?.[0] ?? '', '').trim().replace(/\.?\s*$/, '')
      result.push({ number: m[1].trim(), name: m[2].trim(), location, region })
    }
  }

  return result
}

// ── Item changes ──────────────────────────────────────────────────────────────

function parseItemChanges(): ItemChange[] {
  const content = readDoc(f => f.includes('CAMBIOS') && f.includes('OBJETOS'))
  const result: ItemChange[] = []
  let currentSection = ''
  let currentEntry: ItemChange | null = null

  const flush = () => {
    if (currentEntry) result.push(currentEntry)
    currentEntry = null
  }

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line || /^-{3,}/.test(line)) {
      continue
    }

    // Section headers (all uppercase, no colon)
    if (line === line.toUpperCase() && !line.includes(':') && line.length > 3 && /[A-ZÁÉÍÓÚÑÜ]/.test(line)) {
      flush()
      currentSection = line
      continue
    }

    // Item change: "ItemName: effect"
    const m = line.match(/^([^:]+): (.+)/)
    if (m) {
      flush()
      currentEntry = { name: m[1].trim(), effect: m[2].trim(), section: currentSection }
      continue
    }

    // Continuation bullet
    if (currentEntry && line.startsWith('-')) {
      currentEntry.effect += '\n' + line
    }
  }
  flush()

  return result
}

// ── Guide (T1-T5) ─────────────────────────────────────────────────────────────

function parseGuide(filename: string, region: string): RegionGuide {
  const files = fs.readdirSync(DOCS_DIR)
  const file = files.find(f => f.includes(filename))
  if (!file) return { region, sections: [] }
  const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8')

  const sections: GuideSection[] = []
  let currentLocation = ''
  let currentBattles: Battle[] = []
  let currentBattle: Battle | null = null
  let currentPokemon: PokemonEncounter | null = null

  const flushPokemon = () => {
    if (currentPokemon && currentBattle) {
      currentBattle.pokemon.push(currentPokemon)
      currentPokemon = null
    }
  }

  const flushBattle = () => {
    flushPokemon()
    if (currentBattle) {
      currentBattles.push(currentBattle)
      currentBattle = null
    }
  }

  const flushSection = () => {
    flushBattle()
    if (currentLocation) {
      sections.push({ location: currentLocation, battles: currentBattles })
    }
    currentLocation = ''
    currentBattles = []
  }

  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Location/section headers (followed by --- line)
    const nextLine = lines[i + 1]?.trim() ?? ''
    if (nextLine.startsWith('---') || (nextLine === '' && lines[i + 2]?.trim().startsWith('---'))) {
      if (/^[A-ZÁÉÍÓÚÑÜ]/.test(line) && !line.startsWith('VS ')) {
        flushSection()
        currentLocation = line
        continue
      }
    }

    // Separator lines
    if (/^-{3,}/.test(line)) continue

    // VS trainer
    if (line.startsWith('VS ') || line.startsWith('vs ')) {
      flushBattle()
      currentBattle = { trainerName: line.replace(/^[Vv][Ss]\s+/, ''), pokemon: [] }
      continue
    }

    // Pokemon entry: "- NAME (Nv. LEVEL) | ITEM | Nat: NATURE"
    const pkmnM = line.match(/^-\s+(.+?)\s+\(Nv\.\s*(\d+)\)\s*\|\s*(.+?)\s*\|\s*Nat:\s*(.*)/)
    if (pkmnM) {
      flushPokemon()
      currentPokemon = {
        name: pkmnM[1].trim(),
        level: +pkmnM[2],
        item: pkmnM[3].trim(),
        nature: pkmnM[4].trim(),
      }
      continue
    }

    // Moves line
    if (currentPokemon && line.startsWith('Mov:')) {
      currentPokemon.moves = line.replace('Mov:', '').split(',').map(m => m.trim())
      continue
    }

    // IVs/EVs line
    if (currentPokemon && line.startsWith('IVs:')) {
      const parts = line.split('|')
      currentPokemon.ivs = parts[0]?.replace('IVs:', '').trim()
      currentPokemon.evs = parts[1]?.replace('EVs:', '').trim()
      continue
    }
  }
  flushSection()

  return { region, sections }
}

// ── Canonical mega → PokéAPI sprite ID ───────────────────────────────────────

const CANONICAL_MEGA_SPRITE_IDS: Record<string, number> = {
  'MEGA VENUSAUR':    10033,
  'MEGA CHARIZARD X': 10034,
  'MEGA CHARIZARD Y': 10035,
  'MEGA BLASTOISE':   10036,
  'MEGA GENGAR':      10038,
  'MEGA SCIZOR':      10046,
  'MEGA HOUNDOOM':    10048,
  'MEGA GARDEVOIR':   10051,
  'MEGA SHARPEDO':    10070,
  'MEGA CAMERUPT':    10087,
  'MEGA ALTARIA':     10067,
  'MEGA ABSOL':       10057,
  'MEGA GLALIE':      10074,
  'MEGA LATIOS':      10063,
  'MEGA LOPUNNY':     10088,
}

const CANONICAL_MEGA_API_SLUGS: Record<string, string> = {
  'MEGA VENUSAUR':    'venusaur-mega',
  'MEGA CHARIZARD X': 'charizard-mega-x',
  'MEGA CHARIZARD Y': 'charizard-mega-y',
  'MEGA BLASTOISE':   'blastoise-mega',
  'MEGA GENGAR':      'gengar-mega',
  'MEGA SCIZOR':      'scizor-mega',
  'MEGA HOUNDOOM':    'houndoom-mega',
  'MEGA GARDEVOIR':   'gardevoir-mega',
  'MEGA SHARPEDO':    'sharpedo-mega',
  'MEGA CAMERUPT':    'camerupt-mega',
  'MEGA ALTARIA':     'altaria-mega',
  'MEGA ABSOL':       'absol-mega',
  'MEGA GLALIE':      'glalie-mega',
  'MEGA LATIOS':      'latios-mega',
  'MEGA LOPUNNY':     'lopunny-mega',
}

const EN_TO_ES_TYPE: Record<string, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico',
  grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno',
  ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
  rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro',
  steel: 'Acero', fairy: 'Hada',
}

interface ApiStats {
  hp: number; attack: number; defense: number
  spAttack: number; spDefense: number; speed: number; total: number
}

type ApiCache = Record<string, { types: string[]; stats: ApiStats } | null>

interface ParsedPokemonStats {
  name: string
  officialStats?: Stats
  hackromStats?: Stats
  abilities?: string[]
  hackromTypes?: string[]
}

interface ParsedLocation {
  name: string
  dexNumber: number
  location?: string
}

interface ParsedEvolution {
  from: string
  to: string
  method: string
  bidirectional: boolean
}

async function fetchApiPokemon(identifier: string | number): Promise<{ types: string[]; stats: ApiStats } | null> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${identifier}`)
    if (!res.ok) return null
    const data = await res.json() as {
      types: { type: { name: string } }[]
      stats: { base_stat: number; stat: { name: string } }[]
    }
    const types = data.types.map(t => EN_TO_ES_TYPE[t.type.name] ?? t.type.name)
    const sm: Record<string, number> = {}
    for (const s of data.stats) sm[s.stat.name] = s.base_stat
    const stats: ApiStats = {
      hp: sm['hp'] ?? 0, attack: sm['attack'] ?? 0, defense: sm['defense'] ?? 0,
      spAttack: sm['special-attack'] ?? 0, spDefense: sm['special-defense'] ?? 0,
      speed: sm['speed'] ?? 0, total: 0,
    }
    stats.total = stats.hp + stats.attack + stats.defense + stats.spAttack + stats.spDefense + stats.speed
    return { types, stats }
  } catch {
    return null
  }
}

const API_CACHE_PATH = path.join(DATA_DIR, '.api-cache.json')

function loadApiCache(): ApiCache {
  if (!fs.existsSync(API_CACHE_PATH)) return {}
  try {
    return JSON.parse(fs.readFileSync(API_CACHE_PATH, 'utf8')) as ApiCache
  } catch {
    return {}
  }
}

async function enrichWithApiData(pokemon: Pokemon[]): Promise<void> {
  const cache = loadApiCache()
  const CONCURRENCY = 20
  let enriched = 0
  let cacheHits = 0

  for (let i = 0; i < pokemon.length; i += CONCURRENCY) {
    const batch = pokemon.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async p => {
      const identifier = p.dexNumber ?? CANONICAL_MEGA_API_SLUGS[p.name]
      if (!identifier) return
      const needsTypes = !p.types
      const needsStats = !p.officialStats
      if (!needsTypes && !needsStats) return

      const cacheKey = String(identifier)
      let data: { types: string[]; stats: ApiStats } | null
      if (cacheKey in cache) {
        data = cache[cacheKey]
        cacheHits++
      } else {
        data = await fetchApiPokemon(identifier)
        cache[cacheKey] = data
      }

      if (!data) return
      if (needsTypes) p.types = data.types
      if (needsStats) p.officialStats = data.stats
      enriched++
    }))
    process.stdout.write(`\r  fetching from PokéAPI… ${Math.min(i + CONCURRENCY, pokemon.length)}/${pokemon.length}`)
  }

  fs.writeFileSync(API_CACHE_PATH, JSON.stringify(cache, null, 2))
  console.log(`\r  → enriched ${enriched} entries (${cacheHits} from cache)          `)
}

// ── Gen 9 reference list (Paldea, added as reference; types/stats from PokéAPI) ──

const GEN9_POKEMON: Array<{ name: string; dexNumber: number }> = [
  { name: 'SPRIGATITO', dexNumber: 906 },
  { name: 'FLORAGATO', dexNumber: 907 },
  { name: 'MEOWSCARADA', dexNumber: 908 },
  { name: 'FUECOCO', dexNumber: 909 },
  { name: 'CROCALOR', dexNumber: 910 },
  { name: 'SKELEDIRGE', dexNumber: 911 },
  { name: 'QUAXLY', dexNumber: 912 },
  { name: 'QUAXWELL', dexNumber: 913 },
  { name: 'QUAQUAVAL', dexNumber: 914 },
  { name: 'LECHONK', dexNumber: 915 },
  { name: 'OINKOLOGNE', dexNumber: 916 },
  { name: 'TAROUNTULA', dexNumber: 917 },
  { name: 'SPIDOPS', dexNumber: 918 },
  { name: 'NYMBLE', dexNumber: 919 },
  { name: 'LOKIX', dexNumber: 920 },
  { name: 'PAWMI', dexNumber: 921 },
  { name: 'PAWMO', dexNumber: 922 },
  { name: 'PAWMOT', dexNumber: 923 },
  { name: 'TANDEMAUS', dexNumber: 924 },
  { name: 'MAUSHOLD', dexNumber: 925 },
  { name: 'FIDOUGH', dexNumber: 926 },
  { name: 'DACHSBUN', dexNumber: 927 },
  { name: 'SMOLIV', dexNumber: 928 },
  { name: 'DOLLIV', dexNumber: 929 },
  { name: 'ARBOLIVA', dexNumber: 930 },
  { name: 'SQUAWKABILLY', dexNumber: 931 },
  { name: 'NACLI', dexNumber: 932 },
  { name: 'NACLSTACK', dexNumber: 933 },
  { name: 'GARGANACL', dexNumber: 934 },
  { name: 'CHARCADET', dexNumber: 935 },
  { name: 'ARMAROUGE', dexNumber: 936 },
  { name: 'CERULEDGE', dexNumber: 937 },
  { name: 'TADBULB', dexNumber: 938 },
  { name: 'BELLIBOLT', dexNumber: 939 },
  { name: 'WATTREL', dexNumber: 940 },
  { name: 'KILOWATTREL', dexNumber: 941 },
  { name: 'MASCHIFF', dexNumber: 942 },
  { name: 'MABOSSTIFF', dexNumber: 943 },
  { name: 'SHROODLE', dexNumber: 944 },
  { name: 'GRAFAIAI', dexNumber: 945 },
  { name: 'BRAMBLIN', dexNumber: 946 },
  { name: 'BRAMBLEGHAST', dexNumber: 947 },
  { name: 'TOEDSCOOL', dexNumber: 948 },
  { name: 'TOEDSCRUEL', dexNumber: 949 },
  { name: 'KLAWF', dexNumber: 950 },
  { name: 'CAPSAKID', dexNumber: 951 },
  { name: 'SCOVILLAIN', dexNumber: 952 },
  { name: 'RELLOR', dexNumber: 953 },
  { name: 'RABSCA', dexNumber: 954 },
  { name: 'FLITTLE', dexNumber: 955 },
  { name: 'ESPATHRA', dexNumber: 956 },
  { name: 'TINKATINK', dexNumber: 957 },
  { name: 'TINKATUFF', dexNumber: 958 },
  { name: 'TINKATON', dexNumber: 959 },
  { name: 'WIGLETT', dexNumber: 960 },
  { name: 'WUGTRIO', dexNumber: 961 },
  { name: 'BOMBIRDIER', dexNumber: 962 },
  { name: 'FINIZEN', dexNumber: 963 },
  { name: 'PALAFIN', dexNumber: 964 },
  { name: 'VAROOM', dexNumber: 965 },
  { name: 'REVAVROOM', dexNumber: 966 },
  { name: 'CYCLIZAR', dexNumber: 967 },
  { name: 'ORTHWORM', dexNumber: 968 },
  { name: 'GLIMMET', dexNumber: 969 },
  { name: 'GLIMMORA', dexNumber: 970 },
  { name: 'GREAVARD', dexNumber: 971 },
  { name: 'HOUNDSTONE', dexNumber: 972 },
  { name: 'FLAMIGO', dexNumber: 973 },
  { name: 'CETODDLE', dexNumber: 974 },
  { name: 'CETITAN', dexNumber: 975 },
  { name: 'VELUZA', dexNumber: 976 },
  { name: 'DONDOZO', dexNumber: 977 },
  { name: 'TATSUGIRI', dexNumber: 978 },
  { name: 'ANNIHILAPE', dexNumber: 979 },
  { name: 'CLODSIRE', dexNumber: 980 },
  { name: 'FARIGIRAF', dexNumber: 981 },
  { name: 'DUDUNSPARCE', dexNumber: 982 },
  { name: 'KINGAMBIT', dexNumber: 983 },
  { name: 'GREAT TUSK', dexNumber: 984 },
  { name: 'SCREAM TAIL', dexNumber: 985 },
  { name: 'BRUTE BONNET', dexNumber: 986 },
  { name: 'FLUTTER MANE', dexNumber: 987 },
  { name: 'SLITHER WING', dexNumber: 988 },
  { name: 'SANDY SHOCKS', dexNumber: 989 },
  { name: 'IRON TREADS', dexNumber: 990 },
  { name: 'IRON BUNDLE', dexNumber: 991 },
  { name: 'IRON HANDS', dexNumber: 992 },
  { name: 'IRON JUGULIS', dexNumber: 993 },
  { name: 'IRON MOTH', dexNumber: 994 },
  { name: 'IRON THORNS', dexNumber: 995 },
  { name: 'FRIGIBAX', dexNumber: 996 },
  { name: 'ARCTIBAX', dexNumber: 997 },
  { name: 'BAXCALIBUR', dexNumber: 998 },
  { name: 'GIMMIGHOUL', dexNumber: 999 },
  { name: 'GHOLDENGO', dexNumber: 1000 },
  { name: 'WO-CHIEN', dexNumber: 1001 },
  { name: 'CHIEN-PAO', dexNumber: 1002 },
  { name: 'TING-LU', dexNumber: 1003 },
  { name: 'CHI-YU', dexNumber: 1004 },
  { name: 'ROARING MOON', dexNumber: 1005 },
  { name: 'IRON VALIANT', dexNumber: 1006 },
  { name: 'KORAIDON', dexNumber: 1007 },
  { name: 'MIRAIDON', dexNumber: 1008 },
  { name: 'WALKING WAKE', dexNumber: 1009 },
  { name: 'IRON LEAVES', dexNumber: 1010 },
  { name: 'DIPPLIN', dexNumber: 1011 },
  { name: 'POLTCHAGEIST', dexNumber: 1012 },
  { name: 'SINISTCHA', dexNumber: 1013 },
  { name: 'OKIDOGI', dexNumber: 1014 },
  { name: 'MUNKIDORI', dexNumber: 1015 },
  { name: 'FEZANDIPITI', dexNumber: 1016 },
  { name: 'OGERPON', dexNumber: 1017 },
  { name: 'ARCHALUDON', dexNumber: 1018 },
  { name: 'HYDRAPPLE', dexNumber: 1019 },
  { name: 'GOUGING FIRE', dexNumber: 1020 },
  { name: 'RAGING BOLT', dexNumber: 1021 },
  { name: 'IRON BOULDER', dexNumber: 1022 },
  { name: 'IRON CROWN', dexNumber: 1023 },
  { name: 'TERAPAGOS', dexNumber: 1024 },
  { name: 'PECHARUNT', dexNumber: 1025 },
]

// ── Assemble Pokemon master list ──────────────────────────────────────────────

function assemblePokemon() {
  const statsContent = readDoc(f => f.includes('STATS') && f.includes('TIPOS'))
  const statsRaw = parseStats(statsContent)
  const locationsRaw = parseLocations()
  const evolutionsRaw = parseEvolutions()
  const experimentsRaw = parseExperiments()

  // Index locations and evolutions by name
  const locationMap = new Map(locationsRaw.map(l => [l.name.toLowerCase(), l]))

  const evolutionMap = new Map<string, string>()
  for (const e of evolutionsRaw) {
    evolutionMap.set(e.to.toLowerCase(), e.method)
  }

  const pokemon: Pokemon[] = []

  for (const entry of statsRaw) {
    const key = entry.name.toLowerCase()
    const loc = locationMap.get(key)
    const evolMethod = evolutionMap.get(key)

    const category = entry.name.startsWith('MEGA ')
      ? 'mega'
      : entry.name.includes('Primigenio') || entry.name.includes('Antiguo')
        ? 'primal'
        : 'base'

    pokemon.push({
      name: entry.name,
      dexNumber: loc?.dexNumber,
      spriteId: CANONICAL_MEGA_SPRITE_IDS[entry.name],
      officialStats: entry.officialStats,
      hackromStats: entry.hackromStats,
      abilities: entry.abilities,
      // doc-defined hackrom types take precedence; API fills in the rest
      types: entry.hackromTypes,
      location: loc?.location,
      evolutionMethod: evolMethod,
      category,
    })
  }

  // Add Pokémon that only appear in locations (no stat changes documented)
  for (const loc of locationsRaw) {
    const already = pokemon.some(p => p.name.toLowerCase() === loc.name.toLowerCase())
    if (!already) {
      pokemon.push({
        name: loc.name,
        dexNumber: loc.dexNumber,
        location: loc.location,
        evolutionMethod: evolutionMap.get(loc.name.toLowerCase()),
        category: 'base',
      })
    }
  }

  // Add Gen 9 reference entries not already in the list
  for (const g9 of GEN9_POKEMON) {
    const already = pokemon.some(p => p.name.toLowerCase() === g9.name.toLowerCase())
    if (!already) {
      pokemon.push({ name: g9.name, dexNumber: g9.dexNumber, category: 'base' })
    }
  }

  // Sort by dex number then name
  pokemon.sort((a, b) => {
    if (a.dexNumber !== undefined && b.dexNumber !== undefined)
      return a.dexNumber - b.dexNumber
    if (a.dexNumber !== undefined) return -1
    if (b.dexNumber !== undefined) return 1
    return a.name.localeCompare(b.name)
  })

  return { pokemon, experiments: experimentsRaw }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('Parsing moves...')
const moves = parseMoves()
fs.writeFileSync(path.join(DATA_DIR, 'moves.json'), JSON.stringify(moves, null, 2))
console.log(`  → ${moves.length} moves`)

console.log('Parsing Pokémon...')
const { pokemon, experiments } = assemblePokemon()
console.log('Enriching with PokéAPI data...')
await enrichWithApiData(pokemon)
fs.writeFileSync(path.join(DATA_DIR, 'pokemon.json'), JSON.stringify(pokemon, null, 2))
fs.writeFileSync(path.join(DATA_DIR, 'experiments.json'), JSON.stringify(experiments, null, 2))
console.log(`  → ${pokemon.length} Pokémon, ${experiments.length} experiments/megas`)

console.log('Parsing items...')
const items = parseItems()
fs.writeFileSync(path.join(DATA_DIR, 'items.json'), JSON.stringify(items, null, 2))
console.log(`  → ${items.length} items`)

console.log('Parsing MTs...')
const mts = parseMTs()
fs.writeFileSync(path.join(DATA_DIR, 'mts.json'), JSON.stringify(mts, null, 2))
console.log(`  → ${mts.length} MTs`)

console.log('Parsing item changes...')
const itemChanges = parseItemChanges()
fs.writeFileSync(path.join(DATA_DIR, 'itemChanges.json'), JSON.stringify(itemChanges, null, 2))
console.log(`  → ${itemChanges.length} item changes`)

console.log('Parsing guide...')
const regions = [
  { file: 'T1', region: 'Kanto' },
  { file: 'T2', region: 'Archi7' },
  { file: 'T3', region: 'Johto' },
  { file: 'T4', region: 'DLC' },
  { file: 'T5', region: 'Hoenn' },
]
const guide = regions.map(({ file, region }) => parseGuide(file, region))
fs.writeFileSync(path.join(DATA_DIR, 'guide.json'), JSON.stringify(guide, null, 2))
const totalSections = guide.reduce((acc, g) => acc + g.sections.length, 0)
console.log(`  → ${totalSections} guide sections across ${regions.length} regions`)

console.log('Done.')
