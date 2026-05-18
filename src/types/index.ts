export interface Stats {
  hp: number
  attack: number
  defense: number
  spAttack: number
  spDefense: number
  speed: number
  total: number
}

export interface Pokemon {
  name: string
  dexNumber?: number
  officialStats?: Stats
  hackromStats?: Stats
  abilities?: string[]
  types?: string[]
  location?: string
  evolutionMethod?: string
  category: 'base' | 'mega' | 'prototype' | 'primal'
  prototypeLevel?: 1 | 2 | 3
}

export interface MoveVersion {
  type: string
  power: string
  accuracy: string
  effect: string
  pp: number
}

export interface Move {
  name: string
  official: MoveVersion
  hackrom: MoveVersion
}

export interface PokemonEncounter {
  name: string
  level: number
  item: string
  nature: string
  moves?: string[]
  ivs?: string
  evs?: string
}

export interface Battle {
  trainerName: string
  pokemon: PokemonEncounter[]
}

export interface GuideSection {
  location: string
  battles: Battle[]
}

export interface RegionGuide {
  region: string
  sections: GuideSection[]
}

export interface Item {
  name: string
  category: string
  description: string
}
