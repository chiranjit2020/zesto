import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../routes/Home';
import { Improviser } from '../routes/Improviser';
import { Discover } from '../routes/Discover';

describe('smoke — routes render without crashing', () => {
  it('Home asks the core question and shows the modes', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText(/what can you make right now/i)).toBeInTheDocument();
    expect(screen.getByText(/i'm broke/i)).toBeInTheDocument();
    expect(screen.getByText(/midnight hunger/i)).toBeInTheDocument();
  });

  it('Improviser renders the ₹99 formula columns', () => {
    render(
      <MemoryRouter>
        <Improviser />
      </MemoryRouter>,
    );
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('Flavour')).toBeInTheDocument();
  });

  it('Discover lists recipes', () => {
    render(
      <MemoryRouter>
        <Discover />
      </MemoryRouter>,
    );
    expect(screen.getByText(/all 99 recipes/i)).toBeInTheDocument();
  });
});
