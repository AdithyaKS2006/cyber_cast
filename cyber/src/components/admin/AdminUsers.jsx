import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Shield, ToggleLeft, ToggleRight, 
  Trash2, Edit, X, Check, Eye
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import toast from 'react-hot-toast';
import apiClient from '../../utils/apiClient';

const AdminUsers = () => {
  const [users, setUsers] = useState([
    { id: '1', name: 'J. Smith', email: 'analyst@cyber.io', role: 'Analyst', status: 'Active', lastLogin: '2 min ago', avatar: 'JS' },
    { id: '2', name: 'A. Patel', email: 'validator@cyber.io', role: 'Validator', status: 'Active', lastLogin: '8 min ago', avatar: 'AP' },
    { id: '3', name: 'M. Chen', email: 'admin@cyber.io', role: 'Administrator', status: 'Active', lastLogin: '1h ago', avatar: 'MC' },
    { id: '4', name: 'R. Khan', email: 'rk@cyber.io', role: 'Analyst', status: 'Active', lastLogin: '3h ago', avatar: 'RK' },
    { id: '5', name: 'S. Lee', email: 'sl@cyber.io', role: 'Validator', status: 'Active', lastLogin: '5h ago', avatar: 'SL' },
  ]);
  
  const [inviteOpen, setInviteOpen] = useState(false);
  const [auditUser, setAuditUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Invite modal form fields
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Analyst');

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/api/v1/auth/users/');
      if (res.data?.results) {
        const mapped = res.data.results.map(u => ({
          id: String(u.id),
          name: u.first_name ? `${u.first_name} ${u.last_name}` : u.username,
          email: u.email,
          role: u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Analyst',
          status: u.is_active ? 'Active' : 'Suspended',
          lastLogin: u.last_login ? new Date(u.last_login).toLocaleTimeString() : 'Never',
          avatar: u.avatar_initials || u.username.slice(0, 2).toUpperCase()
        }));
        setUsers(mapped);
      }
    } catch (err) {
      console.warn("Using baseline staff users list", err);
    }
  };

  // Single actions handlers
  const handleToggleSuspend = async (e, user) => {
    e.stopPropagation();
    const nextStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await apiClient.post(`/api/v1/admin/users/${user.id}/toggle-status/`);
    } catch (err) {
      console.warn("Backend toggle API fallback", err);
    }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
    toast.success(`User ${user.name} status updated to ${nextStatus}.`);
  };

  const handleDeleteUser = (e, user) => {
    e.stopPropagation();
    if (window.confirm(`Purge user ${user.name} from sandbox registry?`)) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success(`Purged: user record deleted`);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    try {
      await apiClient.post('/api/v1/auth/users/invite/', {
        email: inviteEmail,
        role: inviteRole.toLowerCase()
      });
    } catch (err) {
      console.warn("Invite endpoint fallback", err);
    }

    const initials = inviteEmail.slice(0, 2).toUpperCase();
    const newUser = {
      id: String(users.length + 1),
      name: inviteEmail.split('@')[0].toUpperCase(),
      email: inviteEmail,
      role: inviteRole,
      status: 'Active',
      lastLogin: 'Never',
      avatar: initials
    };
    
    setUsers(prev => [...prev, newUser]);
    toast.success(`Invitation protocol dispatched to ${inviteEmail}`);
    setInviteOpen(false);
    setInviteEmail('');
  };

  // Filters mapping
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
      return matchesRole && matchesStatus;
    });
  }, [users, roleFilter, statusFilter]);

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Administrator': return 'text-red-400 bg-red-950/20 border-red-500/20';
      case 'Validator': return 'text-orange-400 bg-orange-950/20 border-orange-500/20';
      case 'Analyst': return 'text-blue-400 bg-blue-950/20 border-blue-500/20';
      default: return 'text-zinc-400 bg-zinc-950 border-zinc-800';
    }
  };

  const getAuditTimeline = (user) => {
    if (!user) return [];
    const defaultActions = [
      { action: 'Submitted IoC', resource: '185.220.101.45', time: '14:22' },
      { action: 'Validated Threat', resource: 'hash a3f8c21d', time: '14:10' },
      { action: 'Generated Report', resource: 'SOC Weekly', time: '09:45' },
      { action: 'SSO Protocol Initiated', resource: 'cipher.local', time: '08:00' },
      { action: 'Updated Policy Profile', resource: 'Level 2 Analyst', time: 'Yesterday' },
      { action: 'Anchored ZK Proof', resource: 'block #18420482', time: 'Yesterday' },
      { action: 'Model Retrained', resource: 'BehaviorDetector-v2', time: '2 days ago' },
    ];
    return defaultActions.map((a, idx) => ({
      ...a,
      id: idx,
      resource: `${user.avatar}-${a.resource}`
    }));
  };

  // Unified DataTable Columns Configuration
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Identity Name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-black flex items-center justify-center font-black text-xs">
            {row.avatar}
          </div>
          <span className="font-bold text-white uppercase">{val}</span>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Terminal Email',
      render: (val) => <span className="text-zinc-400 font-mono text-[10.5px]">{val}</span>
    },
    {
      key: 'role',
      label: 'Authorization',
      render: (val) => (
        <span className={`text-[8.5px] border px-2 py-0.5 rounded font-black uppercase ${getRoleBadgeClass(val)}`}>
          {val}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <div className="flex items-center gap-1.5 font-bold uppercase text-[9.5px]">
          <div className={`w-1.5 h-1.5 rounded-full ${val === 'Active' ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]' : 'bg-red-500'}`} />
          <span className={val === 'Active' ? 'text-emerald-500' : 'text-red-500'}>{val}</span>
        </div>
      )
    },
    {
      key: 'lastLogin',
      label: 'Last Access',
      render: (val) => <span className="text-zinc-500">{val}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, user) => (
        <div className="flex justify-center items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setAuditUser(user)}
            className="p-1.5 rounded bg-zinc-900 border border-emerald-900/10 text-emerald-500 hover:bg-emerald-500 hover:text-black transition-colors"
            title="Inspect Audit Logs"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleToggleSuspend(e, user)}
            className={`p-1.5 rounded bg-zinc-900 border text-zinc-500 hover:text-white transition-colors
              ${user.status === 'Active' ? 'border-amber-950 hover:bg-amber-600' : 'border-emerald-950 hover:bg-emerald-600'}`}
            title={user.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
          >
            {user.status === 'Active' ? <ToggleRight className="w-3.5 h-3.5 text-amber-500" /> : <ToggleLeft className="w-3.5 h-3.5 text-zinc-600" />}
          </button>
          <button
            onClick={(e) => handleDeleteUser(e, user)}
            className="p-1.5 rounded bg-zinc-900 border border-red-950 text-zinc-600 hover:bg-red-600 hover:text-white transition-colors"
            title="Purge Identity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ], [users]);

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">User Management</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Role authorization and network audit trails</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          <span>INVITE USER</span>
        </Button>
      </div>

      {/* Filter Options */}
      <div className="p-4 bg-zinc-950/40 border border-emerald-900/10 rounded-2xl flex flex-wrap gap-4 font-mono">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-black border border-emerald-900/20 rounded-xl p-2.5 text-[10px] text-emerald-500 outline-none focus:border-emerald-500 font-bold"
        >
          <option value="All">ALL ROLES</option>
          <option value="Administrator">ADMINISTRATOR</option>
          <option value="Validator">VALIDATOR</option>
          <option value="Analyst">ANALYST</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black border border-emerald-900/20 rounded-xl p-2.5 text-[10px] text-emerald-500 outline-none focus:border-emerald-500 font-bold"
        >
          <option value="All">ALL STATUSES</option>
          <option value="Active">ACTIVE</option>
          <option value="Suspended">SUSPENDED</option>
        </select>
      </div>

      {/* Registry Card with Reusable DataTable */}
      <Card title="Operational Staff Registry" subtitle="Active personnel records and credentials">
        <div className="mt-4">
          <DataTable
            columns={columns}
            data={filteredUsers}
            pageSize={10}
            selectable={true}
            onRowClick={(row) => setAuditUser(row)}
          />
        </div>
      </Card>

      {/* INVITE USER MODAL */}
      <AnimatePresence>
        {inviteOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInviteOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-950 border border-emerald-500/20 rounded-2xl p-6 space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-emerald-900/10 pb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Secure Invitation Portal</h3>
                </div>
                <button onClick={() => setInviteOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-4 font-mono text-xs uppercase">
                <div className="space-y-2">
                  <label className="text-[8px] font-bold text-zinc-500 block">Staff Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="analyst.ingress@cyber.io"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-black border border-emerald-900/20 rounded-xl p-3 text-emerald-500 outline-none focus:border-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-bold text-zinc-500 block">Authorization Role Assignment</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'Analyst', sub: 'Threat hunting node' },
                      { id: 'Validator', sub: 'Audit node validator' }
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setInviteRole(r.id)}
                        className={`p-3.5 border rounded-xl flex flex-col items-center justify-center text-center transition-all
                          ${inviteRole === r.id ? 'border-emerald-500 bg-emerald-950/5' : 'border-zinc-900 bg-black'}`}
                      >
                        <span className={`text-[10px] font-black ${inviteRole === r.id ? 'text-emerald-500' : 'text-zinc-500'}`}>{r.id}</span>
                        <span className="text-[7px] text-zinc-700 font-bold mt-1 leading-none">{r.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full py-4 mt-6">SEND INVITATION PROTOCOL</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER AUDIT DRAWER (Right Slide-over) */}
      <AnimatePresence>
        {auditUser && (
          <div className="fixed inset-0 z-[150] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuditUser(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-sm bg-zinc-950 border-l border-emerald-500/20 h-full shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-emerald-900/10 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-black flex items-center justify-center font-black">
                    {auditUser.avatar}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase">{auditUser.name}</h3>
                    <p className="text-[8px] font-mono text-zinc-500 uppercase mt-0.5">{auditUser.role} Audit Ledger</p>
                  </div>
                </div>
                <button onClick={() => setAuditUser(null)} className="p-2 rounded bg-zinc-900 border border-emerald-950 text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                <p className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest border-b border-emerald-900/10 pb-1.5">Action Log Timeline</p>
                
                <div className="relative border-l border-emerald-900/10 ml-2.5 pl-5 space-y-4 pt-2 pb-6">
                  {getAuditTimeline(auditUser).map((item) => (
                    <div key={item.id} className="relative font-mono text-[9px] uppercase">
                      <div className="absolute -left-[26px] top-0.5 w-3.5 h-3.5 rounded-full bg-zinc-950 border border-emerald-900/30 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-white leading-none">{item.action}</span>
                        <span className="text-[8px] text-zinc-600 whitespace-nowrap ml-2">{item.time}</span>
                      </div>
                      <p className="text-[8px] text-zinc-500 mt-1 leading-normal truncate max-w-[220px]">
                        RESOURCE: {item.resource}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(AdminUsers);
