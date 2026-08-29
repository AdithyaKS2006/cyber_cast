export const MOCK_IOCS_FULL = Array.from({ length: 30 }, (_, i) => ({
  id: `ioc-${i}`,
  type: ['Bank Account', 'UPI ID', 'Phone Number', 'Crypto Wallet'][i % 4],
  value: ['098765432123', 'fraudster@ybl', '+91-9876543210', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'][i % 4],
  severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'][i % 4],
  source: ['I4C Database', 'Bank Nodal', 'Internal', 'Victim Report'][i % 4],
  timestamp: new Date(Date.now() - i * 3600000).toISOString().replace('T', ' ').slice(0, 19),
  verified: i % 3 !== 0,
  contributor: ['Insp. Sharma', 'SI Patel', 'Admin Mishra'][i % 3],
  reputation: Math.floor(Math.random() * 400) + 600,
  tags: [['Mule Account'], ['UPI Fraud'], ['Sextortion'], ['Phishing']][i % 4],
}));

export const INITIAL_IOCS = [
  { id: '1', type: 'Bank Account', value: '112233445566', severity: 'CRITICAL', status: 'verified', timestamp: '2026-05-20 14:22:01', source: 'I4C Database' },
  { id: '2', type: 'UPI ID', value: 'scammer@okaxis', severity: 'CRITICAL', status: 'verified', timestamp: '2026-05-20 13:45:12', source: 'Bank Nodal' },
  { id: '3', type: 'Phone Number', value: '+91-9988776655', severity: 'CRITICAL', status: 'pending', timestamp: '2026-05-20 12:10:55', source: 'Internal' },
];
