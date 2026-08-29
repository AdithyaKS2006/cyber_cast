import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginModal from './LoginModal';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));

describe('LoginModal Integration', () => {
  let mockOnLogin;
  let mockOnClose;

  beforeEach(() => {
    mockOnLogin = vi.fn();
    mockOnClose = vi.fn();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<LoginModal isOpen={true} onLogin={mockOnLogin} onClose={mockOnClose} />);
    
    expect(screen.getByPlaceholderText('inspector_singh or inspector.singh@crimecast.gov.in')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /initiate link/i })).toBeInTheDocument();
  });

  it('handles successful login flow', async () => {
    const mockUserData = { id: 1, name: 'Test User', email: 'test@cyber.io' };
    const mockTokens = { access: 'mock-access-token', refresh: 'mock-refresh-token' };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...mockTokens, user: mockUserData }),
      })
    );

    render(<LoginModal isOpen={true} onLogin={mockOnLogin} onClose={mockOnClose} />);

    // Simulate user typing
    fireEvent.change(screen.getByPlaceholderText('inspector_singh or inspector.singh@crimecast.gov.in'), {
      target: { value: 'test@cyber.io' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'TestPass123!' },
    });

    // Check device profiling consent checkbox
    fireEvent.click(screen.getByRole('checkbox'));

    // Simulate form submission
    fireEvent.click(screen.getByRole('button', { name: /initiate link/i }));

    // Verify loading state
    const authButton = screen.getByRole('button', { name: /authenticating/i });
    expect(authButton).toBeInTheDocument();
    expect(authButton).toBeDisabled();

    // Verify API request payload
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/auth/login/', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@cyber.io', password: 'TestPass123!', totp_code: '' })
      }));
    });

    // Verify side effects
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith(mockUserData);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles failed login flow', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: 'No active account found with the given credentials' }),
      })
    );

    render(<LoginModal isOpen={true} onLogin={mockOnLogin} onClose={mockOnClose} />);

    // Simulate user typing
    fireEvent.change(screen.getByPlaceholderText('inspector_singh or inspector.singh@crimecast.gov.in'), {
      target: { value: 'wrong@cyber.io' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    });

    // Check device profiling consent checkbox
    fireEvent.click(screen.getByRole('checkbox'));

    // Simulate form submission
    fireEvent.click(screen.getByRole('button', { name: /initiate link/i }));

    // Verify side effects
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No active account found with the given credentials');
      expect(mockOnLogin).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
    
    // Verify loading state is reset
    expect(screen.getByRole('button', { name: /initiate link/i })).not.toBeDisabled();
  });
});
