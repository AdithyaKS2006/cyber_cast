import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    // Reset mocks and localStorage before each test
    global.fetch = vi.fn(() =>
      Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
      })
    );
    localStorage.clear();
  });

  it('sets credentials: include on fetch requests', async () => {
    await apiClient('/api/v1/test');
    
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/test', expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({
        'Content-Type': 'application/json'
      })
    }));
  });

  it('injects X-CSRFToken header if csrftoken cookie is present', async () => {
    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'csrftoken=fake-csrf-token;'
    });
    
    await apiClient('/api/v1/test');
    
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/test', expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({
        'X-CSRFToken': 'fake-csrf-token',
        'Content-Type': 'application/json'
      })
    }));
  });
});
