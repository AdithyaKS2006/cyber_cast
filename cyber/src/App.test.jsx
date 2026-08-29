import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock matchMedia for jsdom
window.matchMedia = window.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

// Mock IntersectionObserver for framer-motion in jsdom
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
};

describe('App Component', () => {
  it('renders without crashing and displays CrimeCast branding', () => {
    render(<App />);
    const branding = screen.getAllByText(/Crime/i)[0];
    expect(branding).toBeInTheDocument();
  });
});
