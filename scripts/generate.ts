import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

  const moves: object[] = []
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

function parseStats(content: string): object[] {
  const statsRegex =
    /(Oficial|Hackrom): Ps (\d+), At (\d+), Def (\d+), At\.esp (\d+), Def\.esp (\d+), Velocid (\d+)\. Total (\d+)/

  const result: object[] = []

  // Split on blank lines followed by a line that looks like a Pokémon name
  const lines = content.split('\n')
  let currentName = ''
  let officialStats: object | undefined
  let hackromStats: object | undefined
  let abilities: string[] = []

  const flush = () => {
    if (currentName) {
      result.push({ name: currentName, officialStats, hackromStats, abilities })
    }
    officialStats = undefined
    hackromStats = undefined
    abilities = []
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

function parseExperiments(): object[] {
  const experimentContent = readDoc(f => f.includes('Experimentos'))
  const megaContent = readDoc(f => f.includes('Megaevoluciones'))

  const result: object[] = []

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
          result.push({ ...currentEntry, category, prototypeLevel: level })
        }
        currentEntry = { name: line.replace(/:$/, '').trim() }
      }
    }

    if (currentEntry.name && (currentEntry.officialStats || currentEntry.hackromStats)) {
      result.push({ ...currentEntry, category, prototypeLevel: level })
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

function parseLocations(): object[] {
  const content = readDoc(f => f.includes('TODOS') && f.includes('PKMN') && !f.includes('EVOLUC'))
  const result: object[] = []

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    // Format: NAME - NUMBER - description
    const m = line.match(/^([A-ZÁÉÍÓÚÑÜa-záéíóúñü_'\s]+) - (\d+) - (.+)/)
    if (m) {
      result.push({
        name: m[1].trim(),
        dexNumber: +m[2],
        location: m[3].trim(),
      })
    }
  }

  return result
}

// ── Evolutions ────────────────────────────────────────────────────────────────

function parseEvolutions(): object[] {
  const content = readDoc(f => f.includes('EVOLUC'))
  const result: object[] = []

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

function parseItems(): object[] {
  const content = readDoc(f => f.includes('OBJETOS') && !f.includes('CAMBIOS'))
  const result: object[] = []

  let currentCategory = ''
  let currentItem: { name: string; category: string; description: string } | null = null

  const flushItem = () => {
    if (currentItem) result.push(currentItem)
    currentItem = null
  }

  for (const raw of content.split('\n')) {
    const line = raw.trim()

    if (!line) continue

    // Category headers
    if (/^[A-ZÁÉÍÓÚÑÜ\s]+$/.test(line) && line.length > 3 && !line.includes(':')) {
      flushItem()
      currentCategory = line
      continue
    }

    // Separator lines
    if (/^-{3,}/.test(line)) continue

    // Item line: "ItemName: description"
    const itemM = line.match(/^([^:]+): (.+)/)
    if (itemM) {
      flushItem()
      currentItem = {
        name: itemM[1].trim(),
        category: currentCategory,
        description: itemM[2].trim(),
      }
      continue
    }

    // Continuation lines (bullet points for item)
    if (currentItem && line.startsWith('-')) {
      currentItem.description += '\n' + line
    }
  }
  flushItem()

  return result
}

// ── Guide (T1-T5) ─────────────────────────────────────────────────────────────

function parseGuide(filename: string, region: string): object {
  const files = fs.readdirSync(DOCS_DIR)
  const file = files.find(f => f.includes(filename))
  if (!file) return { region, sections: [] }
  const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8')

  const sections: object[] = []
  let currentLocation = ''
  let currentBattles: object[] = []
  let currentBattle: { trainerName: string; pokemon: object[] } | null = null
  let currentPokemon: Record<string, unknown> | null = null

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

// ── Assemble Pokemon master list ──────────────────────────────────────────────

function assemblePokemon() {
  const statsContent = readDoc(f => f.includes('STATS') && f.includes('TIPOS'))
  const statsRaw = parseStats(statsContent)
  const locationsRaw = parseLocations()
  const evolutionsRaw = parseEvolutions()
  const experimentsRaw = parseExperiments()

  // Index locations and evolutions by name
  const locationMap = new Map(
    (locationsRaw as Array<{ name: string; dexNumber: number; location: string }>).map(l => [
      l.name.toLowerCase(),
      l,
    ]),
  )

  const evolutionMap = new Map<string, string>()
  for (const e of evolutionsRaw as Array<{ from: string; to: string; method: string }>) {
    evolutionMap.set(e.to.toLowerCase(), e.method)
  }

  const pokemon: object[] = []

  for (const entry of statsRaw as Array<{
    name: string
    officialStats?: object
    hackromStats?: object
    abilities?: string[]
  }>) {
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
      officialStats: entry.officialStats,
      hackromStats: entry.hackromStats,
      abilities: entry.abilities,
      location: loc?.location,
      evolutionMethod: evolMethod,
      category,
    })
  }

  // Add Pokémon that only appear in locations (no stat changes documented)
  for (const loc of locationsRaw as Array<{ name: string; dexNumber: number; location: string }>) {
    const already = (pokemon as Array<{ name: string }>).some(
      p => p.name.toLowerCase() === loc.name.toLowerCase(),
    )
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

  // Sort by dex number then name
  pokemon.sort((a, b) => {
    const pa = a as { dexNumber?: number; name: string }
    const pb = b as { dexNumber?: number; name: string }
    if (pa.dexNumber !== undefined && pb.dexNumber !== undefined)
      return pa.dexNumber - pb.dexNumber
    if (pa.dexNumber !== undefined) return -1
    if (pb.dexNumber !== undefined) return 1
    return pa.name.localeCompare(pb.name)
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
fs.writeFileSync(path.join(DATA_DIR, 'pokemon.json'), JSON.stringify(pokemon, null, 2))
fs.writeFileSync(path.join(DATA_DIR, 'experiments.json'), JSON.stringify(experiments, null, 2))
console.log(`  → ${pokemon.length} Pokémon, ${experiments.length} experiments/megas`)

console.log('Parsing items...')
const items = parseItems()
fs.writeFileSync(path.join(DATA_DIR, 'items.json'), JSON.stringify(items, null, 2))
console.log(`  → ${items.length} items`)

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
const totalSections = guide.reduce((acc, g) => acc + (g as { sections: unknown[] }).sections.length, 0)
console.log(`  → ${totalSections} guide sections across ${regions.length} regions`)

console.log('Done.')
