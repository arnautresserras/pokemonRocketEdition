import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Move, Item, MT, ItemChange, RegionGuide, GuideSection, Battle, PokemonEncounter, Pokemon, Stats } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DOCS_DIR = path.join(__dirname, '../docs')
const DATA_DIR = path.join(__dirname, '../src/data')

const parseWarnings: string[] = []
const warn = (msg: string) => parseWarnings.push(msg)

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/_/g, '-').replace(/\s+/g, ' ').trim()
}

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
      const powerNumeric = parseInt(power, 10)
      const powerValue: number | null = !isNaN(powerNumeric) ? powerNumeric : null
      const accuracy = block.match(/Precisi[oó]n - (.+)/)?.[1]?.trim() ?? ''
      const effect = block.match(/Ef\.Secundario - (.+)/)?.[1]?.trim() ?? ''
      const pp = parseInt(block.match(/PP - (\d+)/)?.[1] ?? '0')
      return { type: typeM?.[1]?.trim() ?? '', power, powerValue, accuracy, effect, pp }
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
  let abilities: string[] | undefined = undefined
  let hackromTypes: string[] | undefined

  const flush = () => {
    if (currentName) {
      result.push({ name: currentName, officialStats, hackromStats, abilities, hackromTypes })
    }
    officialStats = undefined
    hackromStats = undefined
    abilities = undefined
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

    const abilityMatch = line.match(/Habilidad(?:es)?: (.+)/)
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
      if (nameM) {
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
    // Standard format: NAME - NUM - desc (NAME may contain digits, e.g. PORYGON2)
    let m = line.match(/^([A-ZÁÉÍÓÚÑÜa-záéíóúñü_'\s0-9]+) - (\d+) -?\s*(.*)/)
    if (!m) {
      // Fallback: NAME NUM - desc (missing first dash, e.g. MACHAMP 68 - …)
      m = line.match(/^([A-ZÁÉÍÓÚÑÜa-záéíóúñü_']+(?:\s+[A-ZÁÉÍÓÚÑÜa-záéíóúñü_']+)*)\s+(\d+)\s*-\s*(.*)/)
    }
    if (m) {
      result.push({
        name: m[1].trim(),
        dexNumber: +m[2],
        location: m[3].trim() || undefined,
      })
    } else if (/^[A-ZÁÉÍÓÚÑÜ]/.test(line) && /\d/.test(line)) {
      warn(`[locations] unmatched line: ${line.slice(0, 80)}`)
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
  'MEGA ALAKAZAM':    10037,
  'MEGA GENGAR':      10038,
  'MEGA KANGASKHAN':  10039,
  'MEGA PINSIR':      10040,
  'MEGA SLOWBRO':     10041,
  'MEGA AERODACTYL':  10042,
  'MEGA MEWTWO X':    10043,
  'MEGA MEWTWO Y':    10044,
  'MEGA AMPHAROS':    10045,
  'MEGA SCIZOR':      10046,
  'MEGA HERACROSS':   10047,
  'MEGA HOUNDOOM':    10048,
  'MEGA MEDICHAM':    10049,
  'MEGA MANECTRIC':   10050,
  'MEGA GARDEVOIR':   10051,
  'MEGA TYRANITAR':   10052,
  'MEGA BLAZIKEN':    10053,
  'MEGA LATIAS':      10054,
  'MEGA BANETTE':     10055,
  'MEGA ABSOL':       10057,
  'MEGA GARCHOMP':    10058,
  'MEGA LUCARIO':     10059,
  'MEGA ABOMASNOW':   10060,
  'MEGA LATIOS':      10063,
  'MEGA SWAMPERT':    10064,
  'MEGA SCEPTILE':    10065,
  'MEGA ALTARIA':     10067,
  'MEGA MAWILE':      10068,
  'MEGA SABLEYE':     10069,
  'MEGA SHARPEDO':    10070,
  'MEGA SALAMENCE':   10071,
  'MEGA METAGROSS':   10072,
  'MEGA AGGRON':      10073,
  'MEGA GLALIE':      10074,
  'MEGA AUDINO':      10076,
  'MEGA DIANCIE':     10086,
  'MEGA CAMERUPT':    10087,
  'MEGA LOPUNNY':     10088,
  'MEGA GALLADE':     10089,
  'MEGA BEEDRILL':    10090,
  'MEGA PIDGEOT':     10091,
  'MEGA STEELIX':     10109,
}

const CANONICAL_MEGA_API_SLUGS: Record<string, string> = {
  'MEGA VENUSAUR':    'venusaur-mega',
  'MEGA CHARIZARD X': 'charizard-mega-x',
  'MEGA CHARIZARD Y': 'charizard-mega-y',
  'MEGA BLASTOISE':   'blastoise-mega',
  'MEGA BEEDRILL':    'beedrill-mega',
  'MEGA PIDGEOT':     'pidgeot-mega',
  'MEGA ALAKAZAM':    'alakazam-mega',
  'MEGA SLOWBRO':     'slowbro-mega',
  'MEGA GENGAR':      'gengar-mega',
  'MEGA KANGASKHAN':  'kangaskhan-mega',
  'MEGA PINSIR':      'pinsir-mega',
  'MEGA AERODACTYL':  'aerodactyl-mega',
  'MEGA MEWTWO X':    'mewtwo-mega-x',
  'MEGA MEWTWO Y':    'mewtwo-mega-y',
  'MEGA AMPHAROS':    'ampharos-mega',
  'MEGA STEELIX':     'steelix-mega',
  'MEGA SCIZOR':      'scizor-mega',
  'MEGA HERACROSS':   'heracross-mega',
  'MEGA HOUNDOOM':    'houndoom-mega',
  'MEGA TYRANITAR':   'tyranitar-mega',
  'MEGA SCEPTILE':    'sceptile-mega',
  'MEGA BLAZIKEN':    'blaziken-mega',
  'MEGA SWAMPERT':    'swampert-mega',
  'MEGA GARDEVOIR':   'gardevoir-mega',
  'MEGA SABLEYE':     'sableye-mega',
  'MEGA MAWILE':      'mawile-mega',
  'MEGA AGGRON':      'aggron-mega',
  'MEGA MEDICHAM':    'medicham-mega',
  'MEGA MANECTRIC':   'manectric-mega',
  'MEGA SHARPEDO':    'sharpedo-mega',
  'MEGA CAMERUPT':    'camerupt-mega',
  'MEGA ALTARIA':     'altaria-mega',
  'MEGA BANETTE':     'banette-mega',
  'MEGA ABSOL':       'absol-mega',
  'MEGA GLALIE':      'glalie-mega',
  'MEGA SALAMENCE':   'salamence-mega',
  'MEGA METAGROSS':   'metagross-mega',
  'MEGA LATIAS':      'latias-mega',
  'MEGA LATIOS':      'latios-mega',
  'MEGA LOPUNNY':     'lopunny-mega',
  'MEGA GARCHOMP':    'garchomp-mega',
  'MEGA LUCARIO':     'lucario-mega',
  'MEGA ABOMASNOW':   'abomasnow-mega',
  'MEGA GALLADE':     'gallade-mega',
  'MEGA AUDINO':      'audino-mega',
  'MEGA DIANCIE':     'diancie-mega',
}

// Dex numbers for custom new megas (not in PokéAPI) — used for base-form sprite fallback
const CUSTOM_MEGA_DEX_NUMBERS: Record<string, number> = {
  'MEGA BUTTERFREE': 12,
  'MEGA STARMIE':    121,
  'MEGA FLYGON':     330,
  'MEGA MILOTIC':    350,
  'MEGA DUSKNOIR':   477,
  'MEGA PORYGON-Z':  474,
  'MEGA NOIVERN':    715,
  'MEGA TOXTRICITY': 849,
}

// Maps megastone name (as in items file) → standard mega Pokémon name
const MEGA_STONE_MAP: Record<string, string> = {
  'Venusaurita':    'MEGA VENUSAUR',
  'Charizardita-X': 'MEGA CHARIZARD X',
  'Charizardita-Y': 'MEGA CHARIZARD Y',
  'Blastoisenita':  'MEGA BLASTOISE',
  'Beedrillita':    'MEGA BEEDRILL',
  'Pidgeotita':     'MEGA PIDGEOT',
  'Alakazita':      'MEGA ALAKAZAM',
  'Slowbronita':    'MEGA SLOWBRO',
  'Gengarita':      'MEGA GENGAR',
  'Kangaskhanita':  'MEGA KANGASKHAN',
  'Pinsirita':      'MEGA PINSIR',
  'Aerodactylita':  'MEGA AERODACTYL',
  'Mewtwonita-X':   'MEGA MEWTWO X',
  'Mewtwonita-Y':   'MEGA MEWTWO Y',
  'Ampharosita':    'MEGA AMPHAROS',
  'Steelixita':     'MEGA STEELIX',
  'Scizorita':      'MEGA SCIZOR',
  'Heracronita':    'MEGA HERACROSS',
  'Houndoomita':    'MEGA HOUNDOOM',
  'Tyranitarita':   'MEGA TYRANITAR',
  'Sceptilita':     'MEGA SCEPTILE',
  'Blazikenita':    'MEGA BLAZIKEN',
  'Swampertita':    'MEGA SWAMPERT',
  'Gardevoirita':   'MEGA GARDEVOIR',
  'Sablenita':      'MEGA SABLEYE',
  'Mawilita':       'MEGA MAWILE',
  'Aggronita':      'MEGA AGGRON',
  'Medichamita':    'MEGA MEDICHAM',
  'Manectita':      'MEGA MANECTRIC',
  'Sharpedonita':   'MEGA SHARPEDO',
  'Cameruptita':    'MEGA CAMERUPT',
  'Altarianita':    'MEGA ALTARIA',
  'Banettita':      'MEGA BANETTE',
  'Absolita':       'MEGA ABSOL',
  'Glalita':        'MEGA GLALIE',
  'Salamencita':    'MEGA SALAMENCE',
  'Metagrossita':   'MEGA METAGROSS',
  'Latiasita':      'MEGA LATIAS',
  'Latiosita':      'MEGA LATIOS',
  'Lopunnita':      'MEGA LOPUNNY',
  'Garchompita':    'MEGA GARCHOMP',
  'Lucarionita':    'MEGA LUCARIO',
  'Abomasita':      'MEGA ABOMASNOW',
  'Galladita':      'MEGA GALLADE',
  'Audinita':       'MEGA AUDINO',
  'Diancita':       'MEGA DIANCIE',
  // New custom megas
  'Fligonita':      'MEGA FLYGON',
  'Miloticita':     'MEGA MILOTIC',
  'Starmitita':     'MEGA STARMIE',
  'Butterfrita':    'MEGA BUTTERFREE',
  'Dusknoirita':    'MEGA DUSKNOIR',
  'Noivernita':     'MEGA NOIVERN',
  'Toxtricitita':   'MEGA TOXTRICITY',
  'Porygonita':     'MEGA PORYGON-Z',
}

// ── Megastone locations ───────────────────────────────────────────────────────

function parseMegastones(): Map<string, string> {
  const content = readDoc(f => f.includes('OBJETOS') && !f.includes('CAMBIOS'))
  const result = new Map<string, string>()

  const startIdx = content.indexOf('TODAS LAS MEGAPIEDRAS')
  const endIdx = content.indexOf('OBTENCIÓN DE TODAS LAS MTS')
  if (startIdx === -1) return result

  const section = content.slice(startIdx, endIdx !== -1 ? endIdx : undefined)
  for (const raw of section.split('\n')) {
    const line = raw.trim()
    const m = line.match(/^([^:]+): (.+)/)
    if (!m) continue
    const stoneName = m[1].trim()
    const megaName = MEGA_STONE_MAP[stoneName]
    if (!megaName) continue
    result.set(megaName, m[2].trim())
  }

  return result
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

type ApiCache = Record<string, { types: string[]; stats: ApiStats; id?: number } | null>

interface ParsedPokemonStats {
  name: string
  officialStats?: Stats
  hackromStats?: Stats
  abilities: string[] | undefined
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

async function fetchApiPokemon(identifier: string | number): Promise<{ types: string[]; stats: ApiStats; id?: number } | null> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${identifier}`)
    if (!res.ok) return null
    const data = await res.json() as {
      id: number
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
    return { types, stats, id: data.id }
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
      // Regional slugs take priority so forms get their own types (not the base form's)
      const identifier = CANONICAL_REGIONAL_API_SLUGS[p.name] ?? CANONICAL_MEGA_API_SLUGS[p.name] ?? p.dexNumber
      if (!identifier) return
      const needsTypes = !p.types
      const needsStats = !p.officialStats
      if (!needsTypes && !needsStats) return

      const cacheKey = String(identifier)
      let data: { types: string[]; stats: ApiStats; id?: number } | null
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
      // For mega forms without a hard-coded spriteId, use the PokéAPI numeric form ID
      if (p.category === 'mega' && !p.spriteId && data.id) p.spriteId = data.id
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

// ── Name normalisation helpers ────────────────────────────────────────────────

// Stats file uses HONCHCROW; location file uses HONCHKROW.
const LOCATION_NAME_ALIASES: Record<string, string> = {
  honchcrow: 'honchkrow',
}

// Pokémon that exist as forms/variants without their own location entry.
// We reuse the base Pokémon's dex number for sprite lookup.
const FORM_DEX_NUMBERS: Record<string, number> = {
  'WEEZING-GALAR':           110,
  'DARMANITAN ZEN':          555,
  'DARMANITAN GALAR':        555,
  'DARMANITAN GALAR ZEN':    555,
  'LYCANROC FORMA DIURNA':   745,
  'LYCANROC FORMA NOCTURNA': 745,
  'LYCANROC FORMA CREPUSCULAR': 745,
  'VIKABOLT':                738,
}

// PokéAPI slugs for forms/variants whose type differs from the base form.
// Only needed when the base-dex-number fetch would return the wrong types.
// VIKABOLT is deliberately absent: it uses its own dex number (738) directly.
const CANONICAL_REGIONAL_API_SLUGS: Record<string, string> = {
  'WEEZING-GALAR':           'weezing-galar',
  'DARMANITAN ZEN':          'darmanitan-zen',
  'DARMANITAN GALAR':        'darmanitan-galar',
  'DARMANITAN GALAR ZEN':    'darmanitan-galar-zen',
  'LYCANROC FORMA DIURNA':   'lycanroc-midday',
  'LYCANROC FORMA NOCTURNA': 'lycanroc-midnight',
  'LYCANROC FORMA CREPUSCULAR': 'lycanroc-dusk',
}

// ── Assemble Pokemon master list ──────────────────────────────────────────────

function assemblePokemon() {
  const statsContent = readDoc(f => f.includes('STATS') && f.includes('TIPOS'))
  const statsRaw = parseStats(statsContent)
  const locationsRaw = parseLocations()
  const evolutionsRaw = parseEvolutions()
  const experimentsRaw = parseExperiments()
  const megastoneMap = parseMegastones()

  // Separate custom megas from the experiments list — they'll go into the main pokemon list
  const customMegas = experimentsRaw.filter(e => e.category === 'mega')
  const experiments = experimentsRaw.filter(e => e.category !== 'mega')

  // Index locations by normalized name (underscore→dash, lowercase)
  const locationMap = new Map(locationsRaw.map(l => [normalizeName(l.name), l]))

  const evolutionMap = new Map<string, string>()
  for (const e of evolutionsRaw) {
    evolutionMap.set(e.to.toLowerCase(), e.method)
  }

  // Lookup a location entry using normalized name + alias fallback
  const findLocation = (name: string) => {
    const key = normalizeName(name)
    return locationMap.get(key) ?? locationMap.get(LOCATION_NAME_ALIASES[key] ?? '')
  }

  const pokemon: Pokemon[] = []
  // Track normalized names already in the list to avoid duplicates
  const inPokemon = new Set<string>()

  for (const entry of statsRaw) {
    const loc = findLocation(entry.name)
    const key = normalizeName(entry.name)
    const evolMethod = evolutionMap.get(entry.name.toLowerCase())

    const dexNumber = loc?.dexNumber ?? FORM_DEX_NUMBERS[entry.name]
    if (!dexNumber && entry.name && !entry.name.startsWith('MEGA ')) {
      warn(`[stats] no dex number for "${entry.name}"`)
    }

    const category = entry.name.startsWith('MEGA ')
      ? 'mega'
      : entry.name.includes('Primigenio') || entry.name.includes('Antiguo')
        ? 'primal'
        : 'base'

    pokemon.push({
      name: entry.name,
      dexNumber,
      spriteId: CANONICAL_MEGA_SPRITE_IDS[entry.name],
      officialStats: entry.officialStats,
      hackromStats: entry.hackromStats,
      abilities: entry.abilities,
      // doc-defined hackrom types take precedence; API fills in the rest
      types: entry.hackromTypes,
      location: loc?.location,
      evolutionMethod: evolMethod,
      megastoneLocation: megastoneMap.get(entry.name),
      category,
    })
    inPokemon.add(key)
  }

  // Add Pokémon that only appear in locations (no stat changes documented)
  for (const loc of locationsRaw) {
    const locKey = normalizeName(loc.name)
    // Skip if already covered directly or via an alias pointing to this location name
    const covered =
      inPokemon.has(locKey) ||
      Object.entries(LOCATION_NAME_ALIASES).some(
        ([statsKey, locAlias]) => locAlias === locKey && inPokemon.has(statsKey),
      )
    if (!covered) {
      pokemon.push({
        name: loc.name,
        dexNumber: loc.dexNumber,
        location: loc.location,
        evolutionMethod: evolutionMap.get(loc.name.toLowerCase()),
        category: 'base',
      })
      inPokemon.add(locKey)
    }
  }

  // Add Gen 9 reference entries not already in the list
  for (const g9 of GEN9_POKEMON) {
    if (!inPokemon.has(normalizeName(g9.name))) {
      pokemon.push({ name: g9.name, dexNumber: g9.dexNumber, category: 'base' })
      inPokemon.add(normalizeName(g9.name))
    }
  }

  // Add all official megas not already covered by the stats file
  for (const megaName of Object.keys(CANONICAL_MEGA_API_SLUGS)) {
    const key = normalizeName(megaName)
    if (inPokemon.has(key)) continue
    pokemon.push({
      name: megaName,
      spriteId: CANONICAL_MEGA_SPRITE_IDS[megaName],
      megastoneLocation: megastoneMap.get(megaName),
      category: 'mega',
    })
    inPokemon.add(key)
  }

  // Add custom new megas (from Nuevas Megaevoluciones.txt) not yet in the list
  for (const mega of customMegas) {
    const key = normalizeName(mega.name)
    if (inPokemon.has(key)) continue
    pokemon.push({
      ...mega,
      dexNumber: CUSTOM_MEGA_DEX_NUMBERS[mega.name],
      megastoneLocation: megastoneMap.get(mega.name),
    })
    inPokemon.add(key)
  }

  // Sort by dex number then name
  pokemon.sort((a, b) => {
    if (a.dexNumber !== undefined && b.dexNumber !== undefined)
      return a.dexNumber - b.dexNumber
    if (a.dexNumber !== undefined) return -1
    if (b.dexNumber !== undefined) return 1
    return a.name.localeCompare(b.name)
  })

  return { pokemon, experiments }
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

if (parseWarnings.length > 0) {
  console.log(`\nParse warnings (${parseWarnings.length}):`)
  for (const w of parseWarnings) console.log(`  ⚠  ${w}`)
}

console.log('Done.')
