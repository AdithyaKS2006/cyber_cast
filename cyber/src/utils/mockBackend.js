/**
 * Mock Backend Provider for GitHub Pages / Static Hosting.
 * Provides client-side responses for all CrimeCast endpoints when no live backend is reachable.
 */

const DEMO_OFFICERS = [
  {
    id: 1,
    role: 'Analyst',
    badge: '👮 Insp. Singh',
    rank: 'Field Officer',
    username: 'inspector_singh',
    name: 'Insp. Singh',
    email: 'inspector.singh@crimecast.gov.in',
    agency: 'Cyber Crime Investigation Division (I4C)',
  },
  {
    id: 2,
    role: 'Validator',
    badge: '⚖️ DSP Sharma',
    rank: 'Station Head',
    username: 'dsp_sharma',
    name: 'DSP Sharma',
    email: 'dsp.sharma@crimecast.gov.in',
    agency: 'Cyber Crime Investigation Division (I4C)',
  },
  {
    id: 3,
    role: 'Admin',
    badge: '👑 Admin Lead',
    rank: 'Nodal Admin',
    username: 'admin_crimecast',
    name: 'Admin Lead',
    email: 'admin@crimecast.gov.in',
    agency: 'National Cybercrime Reporting Portal (NCRP)',
  },
];

export const MOCK_COMPLAINTS = [
  {
    id: 'CMP-2026-8841',
    acknowledgement_number: 'NCRP-2026-IN-98214',
    category: 'UPI Fraud',
    sub_category: 'Phishing QR Code / Remote Access Screen Share',
    amount_lost: 485000,
    priority: 'CRITICAL',
    status: 'PREDICTION_ACTIVE',
    incident_date: new Date(Date.now() - 35 * 60000).toISOString(),
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    suspect_account: '918237465012',
    suspect_bank: 'HDFC Bank',
    complainant_name: 'Dr. Rajesh Sundaram',
    complainant_phone: '+91 98450 12345',
    golden_window_remaining_mins: 18,
    chain_hops_detected: 4,
    freeze_status: 'PENDING_NODAL',
  },
  {
    id: 'CMP-2026-8842',
    acknowledgement_number: 'NCRP-2026-IN-98215',
    category: 'Investment Fraud',
    sub_category: 'Fake Stock Trading App (Task Scam)',
    amount_lost: 1850000,
    priority: 'CRITICAL',
    status: 'UNDER_ANALYSIS',
    incident_date: new Date(Date.now() - 65 * 60000).toISOString(),
    created_at: new Date(Date.now() - 40 * 60000).toISOString(),
    state: 'Maharashtra',
    district: 'Mumbai Suburban',
    suspect_account: '348201948511',
    suspect_bank: 'ICICI Bank',
    complainant_name: 'Meera Deshmukh',
    complainant_phone: '+91 98200 54321',
    golden_window_remaining_mins: 34,
    chain_hops_detected: 6,
    freeze_status: 'FROZEN_PARTIAL',
  },
  {
    id: 'CMP-2026-8843',
    acknowledgement_number: 'NCRP-2026-IN-98216',
    category: 'Digital Arrest Scam',
    sub_category: 'CBI / ED Impersonation Video Call',
    amount_lost: 3200000,
    priority: 'CRITICAL',
    status: 'INTERCEPTED',
    incident_date: new Date(Date.now() - 110 * 60000).toISOString(),
    created_at: new Date(Date.now() - 85 * 60000).toISOString(),
    state: 'Delhi',
    district: 'New Delhi',
    suspect_account: '501004928371',
    suspect_bank: 'State Bank of India',
    complainant_name: 'Anand Verma',
    complainant_phone: '+91 98110 98765',
    golden_window_remaining_mins: 0,
    chain_hops_detected: 5,
    freeze_status: 'FROZEN_FULL',
  },
  {
    id: 'CMP-2026-8844',
    acknowledgement_number: 'NCRP-2026-IN-98217',
    category: 'SIM Swap / OTP',
    sub_category: 'eSIM Social Engineering Hijack',
    amount_lost: 240000,
    priority: 'HIGH',
    status: 'NEW',
    incident_date: new Date(Date.now() - 15 * 60000).toISOString(),
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
    state: 'Telangana',
    district: 'Hyderabad',
    suspect_account: '629104827361',
    suspect_bank: 'Axis Bank',
    complainant_name: 'Suresh Reddy',
    complainant_phone: '+91 98490 65432',
    golden_window_remaining_mins: 45,
    chain_hops_detected: 2,
    freeze_status: 'INITIATED',
  },
  {
    id: 'CMP-2026-8845',
    acknowledgement_number: 'NCRP-2026-IN-98218',
    category: 'Loan App Harassment',
    sub_category: 'Predatory Instant Loan Contact Harassment',
    amount_lost: 85000,
    priority: 'MEDIUM',
    status: 'UNDER_ANALYSIS',
    incident_date: new Date(Date.now() - 180 * 60000).toISOString(),
    created_at: new Date(Date.now() - 120 * 60000).toISOString(),
    state: 'Haryana',
    district: 'Gurugram',
    suspect_account: '192837465012',
    suspect_bank: 'Punjab National Bank',
    complainant_name: 'Pooja Bhatia',
    complainant_phone: '+91 99990 11223',
    golden_window_remaining_mins: 0,
    chain_hops_detected: 3,
    freeze_status: 'MONITORING',
  },
];

export const MOCK_PREDICTIONS = [
  {
    id: 'PRED-2026-001',
    complaint_ack: 'NCRP-2026-IN-98214',
    complaint: 1,
    lat: 12.9716,
    lon: 77.5946,
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    risk_score: 0.94,
    probability: 0.94,
    confidence: 'CRITICAL',
    time_window_mins: 22,
    predicted_cashout_zone: 'Koramangala 5th Block ATM Cluster',
    outcome: 'PENDING',
    suspect_bank: 'HDFC Bank',
    amount: 485000,
    mule_account: '562a4f9309f5... (HDFC)',
    top_features: [
      { name: 'Velocity of transfer', contribution: '+0.34' },
      { name: 'ATM night withdrawal pattern', contribution: '+0.28' },
      { name: 'New UPI device registration', contribution: '+0.21' },
    ],
  },
  {
    id: 'PRED-2026-002',
    complaint_ack: 'NCRP-2026-IN-98215',
    complaint: 2,
    lat: 19.0760,
    lon: 72.8777,
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    risk_score: 0.88,
    probability: 0.88,
    confidence: 'HIGH',
    time_window_mins: 41,
    predicted_cashout_zone: 'Andheri West Link Road Micro-ATM Hub',
    outcome: 'PENDING',
    suspect_bank: 'ICICI Bank',
    amount: 1850000,
    mule_account: '7953d77bed72... (ICICI)',
    top_features: [
      { name: 'Split multi-account dispersal', contribution: '+0.41' },
      { name: 'Crypto OTC desk linkage', contribution: '+0.25' },
    ],
  },
  {
    id: 'PRED-2026-003',
    complaint_ack: 'NCRP-2026-IN-98216',
    complaint: 3,
    lat: 28.6139,
    lon: 77.2090,
    district: 'New Delhi',
    state: 'Delhi',
    risk_score: 0.79,
    probability: 0.79,
    confidence: 'HIGH',
    time_window_mins: 15,
    predicted_cashout_zone: 'Connaught Place Outer Circle Bank Kiosk',
    outcome: 'INTERCEPTED',
    suspect_bank: 'State Bank of India',
    amount: 3200000,
    mule_account: '92a4de7b02f4... (SBI)',
    top_features: [
      { name: 'Rapid RTGS drain attempt', contribution: '+0.45' },
    ],
  },
  {
    id: 'PRED-2026-004',
    complaint_ack: 'NCRP-2026-IN-98217',
    complaint: 4,
    lat: 17.3850,
    lon: 78.4867,
    district: 'Hyderabad',
    state: 'Telangana',
    risk_score: 0.82,
    probability: 0.82,
    confidence: 'HIGH',
    time_window_mins: 34,
    predicted_cashout_zone: 'Hitec City Metro Station ATM',
    outcome: 'PENDING',
    suspect_bank: 'Axis Bank',
    amount: 240000,
    mule_account: '4ff1f6cdfe1a... (Axis)',
    top_features: [
      { name: 'Geographic anomaly between victim & ATM', contribution: '+0.38' },
    ],
  },
  {
    id: 'PRED-2026-005',
    complaint_ack: 'NCRP-2026-IN-98218',
    complaint: 5,
    lat: 28.4595,
    lon: 77.0266,
    district: 'Gurugram',
    state: 'Haryana',
    risk_score: 0.68,
    probability: 0.68,
    confidence: 'MEDIUM',
    time_window_mins: 55,
    predicted_cashout_zone: 'Cyber Hub Ground Level Dispenser',
    outcome: 'NEEDS_REVIEW',
    suspect_bank: 'Punjab National Bank',
    amount: 85000,
    mule_account: 'fbcff19bd268... (PNB)',
    top_features: [
      { name: 'High-frequency micro withdrawal', contribution: '+0.29' },
    ],
  },
];

export const MOCK_DASHBOARD_STATS = {
  total_complaints: 14280,
  active_predictions: 14,
  intercepted_amount: 5670000000,
  intercepted_formatted: '₹ 567 Cr',
  potential_recovery_rate: 89.2,
  average_window_minutes: 42.5,
  jurisdictions_engaged: 28,
  bank_nodes_integrated: 42,
  freeze_orders_issued: 320,
  active_syndicates_monitored: 8,
};

export const MOCK_FREEZE_QUEUE = [
  {
    id: 'FRZ-2026-101',
    complaint_id: 'CMP-2026-8841',
    account_number: '••••••••5012',
    account_holder: 'Aman Kumar (Mule #1)',
    bank_name: 'HDFC Bank',
    branch: 'Koramangala, Bengaluru',
    ifsc: 'HDFC0000123',
    frozen_amount: 485000,
    status: 'SENT_TO_NODAL',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    legal_section: 'Section 106 BNSS 2023',
    nodal_officer: 'nodal.hdfc@bank.i4c.gov.in',
  },
  {
    id: 'FRZ-2026-102',
    complaint_id: 'CMP-2026-8842',
    account_number: '••••••••8511',
    account_holder: 'Vikram Joshi (Mule #2)',
    bank_name: 'ICICI Bank',
    branch: 'Andheri West, Mumbai',
    ifsc: 'ICIC0000456',
    frozen_amount: 1850000,
    status: 'FROZEN_CONFIRMED',
    created_at: new Date(Date.now() - 28 * 60000).toISOString(),
    legal_section: 'Section 106 BNSS 2023',
    nodal_officer: 'nodal.icici@bank.i4c.gov.in',
  },
  {
    id: 'FRZ-2026-103',
    complaint_id: 'CMP-2026-8843',
    account_number: '••••••••8371',
    account_holder: 'Deepak Enterprise (Shell Entity)',
    bank_name: 'State Bank of India',
    branch: 'Parliament Street, New Delhi',
    ifsc: 'SBIN0000789',
    frozen_amount: 3200000,
    status: 'FROZEN_CONFIRMED',
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    legal_section: 'Section 106 BNSS 2023',
    nodal_officer: 'nodal.sbi@bank.i4c.gov.in',
  },
];

export const MOCK_GRAPH_NETWORK = {
  nodes: [
    { id: 'VIC-1', label: 'Victim (Bengaluru)', type: 'victim', amount: 485000 },
    { id: 'MULE-1', label: 'Mule 1 (HDFC)', type: 'mule_layer_1', amount: 485000, hash: '562a4f9309f5' },
    { id: 'MULE-2', label: 'Mule 2 (Axis)', type: 'mule_layer_2', amount: 300000, hash: '7953d77bed72' },
    { id: 'MULE-3', label: 'Mule 3 (ICICI)', type: 'mule_layer_2', amount: 185000, hash: '92a4de7b02f4' },
    { id: 'ATM-1', label: 'ATM #42 (Koramangala)', type: 'cashout_target', amount: 185000 },
    { id: 'SYND-1', label: 'Operation Garuda Syndicate', type: 'syndicate_core', score: 98 },
  ],
  links: [
    { source: 'VIC-1', target: 'MULE-1', amount: 485000, tx: 'UPI-TX-10928' },
    { source: 'MULE-1', target: 'MULE-2', amount: 300000, tx: 'IMPS-TX-20918' },
    { source: 'MULE-1', target: 'MULE-3', amount: 185000, tx: 'IMPS-TX-20919' },
    { source: 'MULE-3', target: 'ATM-1', amount: 185000, tx: 'ATM-DISPATCH-PRED' },
    { source: 'MULE-2', target: 'SYND-1', amount: 300000, tx: 'OTC-USDT' },
  ],
};

/**
 * Handle incoming mock API requests in browser memory.
 */
export async function handleMockRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const path = endpoint.split('?')[0].replace(/\/$/, '');

  // Helper response builder
  const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  // 1. Session check: /api/v1/users/me
  if (path.endsWith('/api/v1/users/me')) {
    const saved = localStorage.getItem('crimecast_demo_user');
    if (saved) {
      try {
        return jsonResponse(JSON.parse(saved));
      } catch {
        // invalid JSON
      }
    }
    // Return 401 without causing browser network 404
    return jsonResponse({ detail: 'Authentication credentials were not provided.' }, 401);
  }

  // 2. Authentication: /api/v1/auth/login
  if (path.endsWith('/api/v1/auth/login')) {
    let body = {};
    if (typeof options.body === 'string') {
      try { body = JSON.parse(options.body); } catch {}
    }
    const input = String(body.email || body.username || 'inspector_singh').toLowerCase();
    const officer = DEMO_OFFICERS.find(o =>
      input.includes(o.username) || input.includes(o.role.toLowerCase()) || input.includes('sharma') || input.includes('admin')
    ) || DEMO_OFFICERS[0];

    const userObj = {
      id: officer.id,
      username: officer.username,
      email: officer.email,
      name: officer.name,
      role: officer.role,
      badge: officer.badge,
      rank: officer.rank,
      agency: officer.agency,
    };
    localStorage.setItem('crimecast_demo_user', JSON.stringify(userObj));
    return jsonResponse({
      access: 'mock-access-token-sih-2026',
      refresh: 'mock-refresh-token-sih-2026',
      user: userObj,
    }, 200);
  }

  // 3. Registration: /api/v1/auth/register
  if (path.endsWith('/api/v1/auth/register')) {
    let body = {};
    if (typeof options.body === 'string') {
      try { body = JSON.parse(options.body); } catch {}
    }
    const userObj = {
      id: 99,
      username: body.username || 'registered_officer',
      email: body.email || 'officer@crimecast.gov.in',
      name: body.full_name || body.name || 'Officer',
      role: body.role || 'Analyst',
      badge: '👮 Officer Unit',
      rank: 'Authorized Officer',
      agency: body.agency || 'Cyber Crime Division',
    };
    localStorage.setItem('crimecast_demo_user', JSON.stringify(userObj));
    return jsonResponse({
      message: 'Officer unit registered successfully.',
      access: 'mock-access-token-sih-2026',
      user: userObj,
    }, 201);
  }

  // 4. Logout: /api/v1/auth/logout
  if (path.endsWith('/api/v1/auth/logout')) {
    localStorage.removeItem('crimecast_demo_user');
    return jsonResponse({ detail: 'Successfully logged out.' }, 200);
  }

  // 5. Dashboard Stats: /api/v1/dashboard/stats
  if (path.includes('/dashboard/stats')) {
    return jsonResponse(MOCK_DASHBOARD_STATS, 200);
  }

  // 6. Complaints: /api/v1/complaints
  if (path.endsWith('/api/v1/complaints')) {
    if (method === 'POST') {
      let body = {};
      if (typeof options.body === 'string') {
        try { body = JSON.parse(options.body); } catch {}
      }
      const newComplaint = {
        id: `CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        acknowledgement_number: `NCRP-2026-IN-${Math.floor(10000 + Math.random() * 90000)}`,
        category: body.category || 'UPI Fraud',
        sub_category: body.sub_category || 'Unauthorized Transaction',
        amount_lost: Number(body.amount_lost) || 50000,
        priority: 'CRITICAL',
        status: 'NEW',
        incident_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        state: body.state || 'Karnataka',
        district: body.district || 'Bengaluru Urban',
        suspect_account: body.suspect_account || '883920194821',
        suspect_bank: body.suspect_bank || 'State Bank of India',
        complainant_name: body.complainant_name || 'Complainant',
      };
      MOCK_COMPLAINTS.unshift(newComplaint);
      return jsonResponse(newComplaint, 201);
    }
    return jsonResponse({
      count: MOCK_COMPLAINTS.length,
      next: null,
      previous: null,
      results: MOCK_COMPLAINTS,
    }, 200);
  }

  // 7. Single Complaint: /api/v1/complaints/:id
  if (path.includes('/api/v1/complaints/')) {
    const parts = path.split('/');
    const id = parts[parts.length - 1];
    const found = MOCK_COMPLAINTS.find(c => c.id === id || c.acknowledgement_number === id) || MOCK_COMPLAINTS[0];
    return jsonResponse(found, 200);
  }

  // 8. Predictions: /api/v1/predictions
  if (path.includes('/predictions/data/model-metrics')) {
    return jsonResponse({
      model_name: 'Calibrated LightGBM v3.0 (40 Districts)',
      overall_accuracy: 0.942,
      top_1_accuracy: 0.884,
      top_3_accuracy: 0.968,
      brier_score: 0.041,
      expected_calibration_error: 0.019,
      auc_roc: 0.974,
      sample_count: 50000,
    }, 200);
  }

  if (path.includes('/predictions/alerts')) {
    return jsonResponse({ count: MOCK_PREDICTIONS.length, results: MOCK_PREDICTIONS }, 200);
  }

  if (path.includes('/predictions/simulate-webhook')) {
    return jsonResponse({ success: true, message: 'Simulation dispatched' }, 200);
  }

  if (path.endsWith('/api/v1/predictions')) {
    return jsonResponse({
      count: MOCK_PREDICTIONS.length,
      results: MOCK_PREDICTIONS,
    }, 200);
  }

  // 9. Freeze Queue: /api/v1/freeze/queue or /api/v2/freeze
  if (path.includes('/freeze')) {
    return jsonResponse({ count: MOCK_FREEZE_QUEUE.length, results: MOCK_FREEZE_QUEUE }, 200);
  }

  // 10. Graph Network: /api/v1/graph or /api/v2/graph
  if (path.includes('/graph')) {
    return jsonResponse(MOCK_GRAPH_NETWORK, 200);
  }

  // 11. CyberGuru AI Assistant: /api/v1/guru/query or chat
  if (path.includes('/guru')) {
    return jsonResponse({
      answer: 'Analysis complete: This complaint displays multi-hop mule layering characteristic of Operation Garuda. Recommendation: Execute Section 106 BNSS freeze order immediately on Tier-1 HDFC account.',
      confidence: 0.96,
      recommendation: 'Freeze Tier-1 account and dispatch beat officer to Koramangala ATM Cluster.',
    }, 200);
  }

  // Fallback generic 200 JSON for other API queries
  return jsonResponse({ status: 'ok', results: [], message: 'CrimeCast static showcase mock' }, 200);
}
