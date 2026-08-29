import {
  LayoutDashboard,
  ClipboardList,
  MapPin,
  Bell,
  BarChart2,
  MessageCircle,
  Settings,
  PlusCircle,
  List,
  Map,
  Activity,
  Crosshair,
  BookOpen,
  ShieldAlert,
  Users,
  Network,
  Zap,
  Search,
  ShieldCheck,
  Globe,
  Radio,
  Smartphone,
} from 'lucide-react';

export const ALL_MENU_GROUPS = [
  {
    title: 'MAIN',
    items: [
      { id: 'dashboard',      icon: LayoutDashboard, label: 'Dashboard',      roles: ['Analyst','Validator','Administrator','Operator'] },
    ],
  },
  {
    title: 'INVESTIGATIONS',
    items: [
      { id: 'complaints',        icon: ClipboardList, label: 'All Complaints',  roles: ['Analyst','Validator','Administrator','Operator'] },
      { id: 'complaints/new',    icon: PlusCircle,    label: 'New Complaint',   roles: ['Analyst','Validator','Administrator','Operator'] },
    ],
  },
  {
    title: 'PREDICTIONS',
    items: [
      { id: 'predictions',        icon: Activity,  label: 'Active Predictions', roles: ['Analyst','Validator','Administrator','Operator'] },
      { id: 'predictions/heatmap',icon: Map,       label: 'Heatmap',            roles: ['Analyst','Validator','Administrator','Operator'] },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { id: 'alerts',          icon: Bell,           label: 'Alert Center',       roles: ['Analyst','Validator','Administrator','Operator'] },
      { id: 'lea-dispatches',  icon: Crosshair,      label: 'Incoming Dispatches',roles: ['Analyst','Validator','Administrator','Operator'] },
      { id: 'gateway-monitor', icon: Radio,          label: 'Gateway Monitor',    roles: ['Analyst','Validator','Administrator','Operator'] },
      { id: 'field-mobile',    icon: Smartphone,     label: 'Field Mobile Mode',  roles: ['Analyst','Validator','Administrator','Operator'] },
      { id: 'analytics',       icon: BarChart2,      label: 'Analytics',          roles: ['Analyst','Validator','Administrator','Operator'] },
      { id: 'ai-advisor',      icon: MessageCircle,  label: 'AI Advisor',         roles: ['Analyst','Validator','Administrator','Operator'] },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'settings',       icon: Settings,        label: 'Settings', roles: ['Analyst','Validator','Administrator','Operator'] },
    ],
  },
];
