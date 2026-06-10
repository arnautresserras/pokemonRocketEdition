import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import PokedexPage from '../pages/PokedexPage'
import MovesPage from '../pages/MovesPage'
import GuidePage from '../pages/GuidePage'
import TypesPage from '../pages/TypesPage'
import NaturesPage from '../pages/NaturesPage'

function withRouter(element: React.ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe('Page smoke tests', () => {
  it('PokedexPage renders without throwing', () => {
    expect(() => withRouter(<PokedexPage />)).not.toThrow()
  })

  it('PokedexPage shows Pokédex heading', () => {
    withRouter(<PokedexPage />)
    expect(screen.getByText(/pokédex/i)).toBeTruthy()
  })

  it('MovesPage renders without throwing', () => {
    expect(() => withRouter(<MovesPage />)).not.toThrow()
  })

  it('GuidePage renders without throwing', () => {
    expect(() => withRouter(<GuidePage />)).not.toThrow()
  })

  it('TypesPage renders without throwing', () => {
    expect(() => withRouter(<TypesPage />)).not.toThrow()
  })

  it('NaturesPage renders without throwing', () => {
    expect(() => withRouter(<NaturesPage />)).not.toThrow()
  })
})
