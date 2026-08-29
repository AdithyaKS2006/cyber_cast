export const ROLES = {
  ANALYST: 'Analyst',
  VALIDATOR: 'Validator',
  ADMIN: 'Administrator'
};

export const MOCK_USERS = [
  { id: 'u1', name: 'Adithya K S', role: ROLES.ADMIN, avatar: 'AK' },
  { id: 'u2', name: 'Analyst Jane', role: ROLES.ANALYST, avatar: 'AJ' },
  { id: 'u3', name: 'Validator Bob', role: ROLES.VALIDATOR, avatar: 'VB' },
];

export const SEVERITY = {
  CRITICAL: { label: 'Critical', color: 'bg-red-600', text: 'text-white' },
  HIGH: { label: 'High', color: 'bg-orange-600', text: 'text-white' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-500', text: 'text-gray-900' },
  LOW: { label: 'Low', color: 'bg-emerald-600', text: 'text-white' },
  INFO: { label: 'Info', color: 'bg-emerald-500', text: 'text-white' }
};

export const MOCK_INCIDENTS = [
  { id: 'INC-2026-101', title: 'High-Velocity UPI Cashout', severity: 'CRITICAL', status: 'Triaging', sla: '0h 14m', lead: 'J. Smith', iocs: 2 },
  { id: 'INC-2026-102', title: 'Card Cloning Syndicate', severity: 'HIGH', status: 'Contained', sla: '1h 02m', lead: 'A. Patel', iocs: 1 },
  { id: 'INC-2026-103', title: 'Mass Phishing Wave — Fake KYC', severity: 'HIGH', status: 'New', sla: '2h 30m', lead: 'M. Chen', iocs: 4 },
  { id: 'INC-2026-104', title: 'Net Banking Account Takeover', severity: 'MEDIUM', status: 'Eradicating', sla: '4h 00m', lead: 'J. Smith', iocs: 2 },
  { id: 'INC-2026-105', title: 'Suspicious ATM Withdrawals (Night)', severity: 'LOW', status: 'Resolved', sla: 'Closed', lead: 'A. Patel', iocs: 1 },
];

export const MOCK_CAMPAIGNS = [
  { id: 'CAMP-001', name: 'Jamtara OTP Fraud Ring', iocs: 14, actor: 'Jamtara Group', confidence: 87, status: 'Active' },
  { id: 'CAMP-002', name: 'Mewat Sextortion Network', iocs: 8, actor: 'Mewat Syndicate', confidence: 72, status: 'Monitoring' },
];

export const MOCK_INTEGRATIONS = [
  { id: 'splunk', name: 'Splunk', category: 'SIEM', desc: 'Push IoCs via HTTP Event Collector', connected: false, icon: '⚡' },
  { id: 'sentinel', name: 'Microsoft Sentinel', category: 'SIEM', desc: 'Stream events to Sentinel workspace', connected: false, icon: '🛡️' },
  { id: 'qradar', name: 'IBM QRadar', category: 'SIEM', desc: 'Bidirectional offense and IoC sync', connected: false, icon: '🔵' },
  { id: 'elastic', name: 'Elastic SIEM', category: 'SIEM', desc: 'Index all events to Elasticsearch', connected: false, icon: '🔍' },
  { id: 'chronicle', name: 'Google Chronicle', category: 'SIEM', desc: 'Forward IoCs as UDM events', connected: false, icon: '📊' },
  { id: 'jira', name: 'Jira Software', category: 'Ticketing', desc: 'Auto-create issues from incidents', connected: false, icon: '🎯' },
  { id: 'servicenow', name: 'ServiceNow', category: 'Ticketing', desc: 'ITSM incident and change management', connected: false, icon: '🔧' },
  { id: 'pagerduty', name: 'PagerDuty', category: 'Ticketing', desc: 'Alert routing for critical incidents', connected: false, icon: '🚨' },
  { id: 'opsgenie', name: 'Opsgenie', category: 'Ticketing', desc: 'On-call routing by threat category', connected: false, icon: '📟' },
  { id: 'slack', name: 'Slack', category: 'Communication', desc: 'Threat alerts and slash commands', connected: true, icon: '💬' },
  { id: 'teams', name: 'Microsoft Teams', category: 'Communication', desc: 'Adaptive cards and Teams bot', connected: false, icon: '🔷' },
  { id: 'webhook', name: 'Webhook (Generic)', category: 'Communication', desc: 'POST JSON to any HTTP endpoint', connected: false, icon: '🔗' },
  { id: 'virustotal', name: 'VirusTotal', category: 'Threat Intel', desc: 'File hash and IP reputation scores', connected: false, icon: '🦠' },
  { id: 'shodan', name: 'Shodan', category: 'Threat Intel', desc: 'IP open ports and service discovery', connected: false, icon: '🔭' },
  { id: 'abuseipdb', name: 'AbuseIPDB', category: 'Threat Intel', desc: 'IP abuse confidence scores', connected: false, icon: '⚠️' },
  { id: 'misp', name: 'MISP', category: 'Threat Intel', desc: 'Bidirectional IoC sync with MISP', connected: false, icon: '🔄' },
  { id: 'otx', name: 'AlienVault OTX', category: 'Threat Intel', desc: 'Subscribe to OTX pulses', connected: false, icon: '👽' },
  { id: 'recordedfuture', name: 'Recorded Future', category: 'Threat Intel', desc: 'Risk scores and threat actor data', connected: false, icon: '📡' },
  { id: 'guardduty', name: 'AWS GuardDuty', category: 'Cloud', desc: 'Import findings as IoCs', connected: false, icon: '☁️' },
  { id: 'azuredefender', name: 'Azure Defender', category: 'Cloud', desc: 'Security alert ingestion', connected: false, icon: '🔷' },
  { id: 'gcpscc', name: 'GCP Security Command Center', category: 'Cloud', desc: 'SCC finding import', connected: false, icon: '🟢' },
  { id: 's3logs', name: 'AWS S3 Log Ingest', category: 'Cloud', desc: 'VPC Flow Logs, CloudTrail, ALB', connected: false, icon: '🪣' },
  { id: 'okta', name: 'Okta', category: 'Identity', desc: 'SAML 2.0 SSO and SCIM provisioning', connected: false, icon: '🔐' },
  { id: 'azuread', name: 'Azure Active Directory', category: 'Identity', desc: 'Azure AD SSO and group sync', connected: false, icon: '🏢' },
  { id: 'googlews', name: 'Google Workspace', category: 'Identity', desc: 'Google SSO and directory sync', connected: false, icon: '🔑' },
];

export const MOCK_PLAYBOOKS = [
  { id: 'pb-1', title: 'UPI Fraud Response', category: 'UPI Fraud', steps: 4, updated: '2026-05-10', steps_list: [
    { title: 'Freeze Destination Account', desc: 'Immediately freeze the suspect account.', initials: 'JS' },
    { title: 'Identify Mule Chain', desc: 'Trace the money trail to identify mule accounts.', initials: 'AP' },
    { title: 'Notify Bank Nodal Officer', desc: 'Alert the nodal officer of the destination bank.', initials: 'MC' },
    { title: 'Generate FIR Report', desc: 'Prepare the FIR report for the victim.', initials: 'JS' }
  ] },
  { id: 'pb-2', title: 'Card Fraud Mitigation', category: 'Card Fraud', steps: 3, updated: '2026-05-08', steps_list: [] },
  { id: 'pb-3', title: 'KYC Phishing Investigation', category: 'Phishing', steps: 5, updated: '2026-05-15', steps_list: [] }
];

export const MITRE_TECHNIQUES = [
  { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
  { id: 'T1071.001', name: 'Web Protocols', tactic: 'C2' },
  { id: 'T1547.001', name: 'Registry Run Keys', tactic: 'Persistence' },
  { id: 'T1055', name: 'Process Injection', tactic: 'Defense Evasion' },
  { id: 'T1041', name: 'Exfiltration Over C2', tactic: 'Exfiltration' },
  { id: 'T1082', name: 'System Information Discovery', tactic: 'Discovery' },
  { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' },
  { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
];

export const INITIAL_NOTIFICATIONS = [
  { id: 'n1', type: 'CRITICAL_THREAT', title: 'High Confidence Shortlist', message: '24.8% cashout probability (Top-1 candidate) at Delhi Connaught Place.', read: false, page: 'predictions', time: '2 min ago' },
  { id: 'n2', type: 'INCIDENT', title: 'Incident Assigned', message: 'You are now lead on INC-2026-101.', read: false, page: 'incidents', time: '15 min ago' },
  { id: 'n3', type: 'REPORT', title: 'Report Ready', message: 'Weekly financial fraud summary report is ready.', read: true, page: 'reports', time: '1h ago' },
];

export const MOCK_IOCS_FULL = [];
