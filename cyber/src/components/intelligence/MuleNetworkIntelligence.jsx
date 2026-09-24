import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, ShieldAlert, AlertTriangle, Search, Filter,
  FileText, Shield, DollarSign, Layers, ExternalLink, RefreshCw, Eye
} from 'lucide-react';
import apiClient from '../../utils/apiClient';

// Custom React Flow Node for Mule Accounts
const CustomMuleNode = ({ data, selected }) => {
  const isConfirmed = data.is_confirmed_mule || data.node_type === 'CONFIRMED_MULE';
  const isVictim = data.node_type === 'VICTIM';
  const isCashout = data.node_type === 'CASHOUT';
  
  let borderColor = 'border-amber-500/60';
  let bgColor = 'bg-amber-950/30';
  let badgeText = data.node_type;
  let badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  if (isConfirmed) {
    borderColor = 'border-purple-500 shadow-lg shadow-purple-900/30';
    bgColor = 'bg-purple-950/60';
    badgeText = 'CONFIRMED MULE';
    badgeColor = 'bg-purple-500/30 text-purple-200 border-purple-500/60 animate-pulse';
  } else if (isVictim) {
    borderColor = 'border-blue-500/60';
    bgColor = 'bg-blue-950/30';
    badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  } else if (isCashout) {
    borderColor = 'border-red-500/70';
    bgColor = 'bg-red-950/40';
    badgeColor = 'bg-red-500/20 text-red-300 border-red-500/40';
  }

  return (
    <div
      className={`px-4 py-3 rounded-2xl border-2 transition-all ${bgColor} ${borderColor} ${
        selected ? 'ring-2 ring-orange-500 scale-105' : ''
      }`}
      style={{ minWidth: '180px', backdropFilter: 'blur(8px)' }}
    >
      <Handle type="target" position={Position.Top} className="!bg-orange-500" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {badgeText}
        </span>
        {data.complaint_count > 1 && (
          <span className="text-[8px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-full">
            {data.complaint_count} Cases
          </span>
        )}
      </div>

      <div className="text-xs font-mono font-bold text-white mb-0.5 truncate">
        {data.masked_account || `•••• ${data.account_hash?.slice(-4).toUpperCase()}`}
      </div>

      <div className="flex items-center justify-between text-[9px] text-zinc-400">
        <span className="truncate">{data.bank_name || data.bank_ifsc || 'Bank'}</span>
        <span className="font-bold text-orange-400">
          ₹{Number(data.total_volume || 0).toLocaleString('en-IN')}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500" />
    </div>
  );
};

const nodeTypes = { muleNode: CustomMuleNode };

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 70, nodesep: 40 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 190, height: 75 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - 95 : Math.random() * 400,
        y: nodeWithPosition ? nodeWithPosition.y - 37 : Math.random() * 400,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const MuleNetworkIntelligence = ({ navigate }) => {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      const res = await apiClient('/api/v2/graph/network/?max_nodes=150');
      if (res.ok) {
        const data = await res.json();
        setNetworkData(data);

        // Format nodes for React Flow
        const rawNodes = (data.nodes || []).map((n) => ({
          id: n.id,
          type: 'muleNode',
          data: n,
          position: { x: 0, y: 0 },
        }));

        // Format edges
        const rawEdges = (data.edges || []).map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: '#f97316', strokeWidth: 2 },
          label: `₹${Number(e.amount).toLocaleString('en-IN')}`,
          labelStyle: { fill: '#fed7aa', fontSize: 9, fontWeight: 700 },
          labelBgStyle: { fill: '#18181b', fillOpacity: 0.9 },
        }));

        const layouted = getLayoutedElements(rawNodes, rawEdges);
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      }
    } catch (e) {
      console.error('Failed to fetch network graph:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetwork();
  }, []);

  // Filter nodes based on search and onlyConfirmed toggle
  const filteredNodes = useMemo(() => {
    let nds = nodes;
    if (onlyConfirmed) {
      nds = nds.filter((n) => n.data.is_confirmed_mule || n.data.complaint_count >= 2);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      nds = nds.filter(
        (n) =>
          n.data.account_hash?.toLowerCase().includes(q) ||
          n.data.bank_ifsc?.toLowerCase().includes(q) ||
          n.data.bank_name?.toLowerCase().includes(q)
      );
    }
    return nds;
  }, [nodes, onlyConfirmed, search]);

  const onNodeClick = (_, node) => {
    setSelectedNode(node.data);
  };

  const handleDownloadNotice = async (freezeId) => {
    try {
      const res = await apiClient(`/api/v2/freeze/${freezeId}/notice/`);
      if (!res.ok) throw new Error('Notice error');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BNSS_Sec106_Notice_${freezeId.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not download Section 106 Notice PDF.');
    }
  };

  const summary = networkData?.summary || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                Cross-Complaint Mule Network
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Unique Intelligence
                </span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">
                Multi-case clustering · Confirmed Mule Classification · 1930 Aggregated Topology
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchNetwork}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
          <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">Mule Accounts Tracked</p>
          <p className="text-2xl font-black text-white">{summary.total_nodes ?? 0}</p>
          <span className="text-[10px] text-zinc-400 mt-1 block">Active Network Nodes</span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/40 backdrop-blur-md">
          <p className="text-[9px] font-black uppercase text-purple-400 mb-1">Confirmed Mules</p>
          <p className="text-2xl font-black text-purple-300">{summary.confirmed_mules_count ?? 0}</p>
          <span className="text-[10px] text-purple-400/80 mt-1 block">Seen in ≥ 2 Complaints</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
          <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">Financial Trail Volume</p>
          <p className="text-2xl font-black text-orange-400">
            ₹{Number(summary.total_fraud_volume_inr ?? 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-zinc-400 mt-1 block">Defrauded Capital In Flight</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
          <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">Multi-Case Repeat Rate</p>
          <p className="text-2xl font-black text-emerald-400">{summary.multi_case_rate ?? 0}%</p>
          <span className="text-[10px] text-zinc-400 mt-1 block">Syndicate Inter-connectivity</span>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search Account Hash or IFSC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            onClick={() => setOnlyConfirmed((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
              onlyConfirmed
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            🚨 Multi-Case Mules Only
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Victim
          </span>
          <span className="flex items-center gap-1.5 ml-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Layer 1/2
          </span>
          <span className="flex items-center gap-1.5 ml-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Confirmed Mule
          </span>
          <span className="flex items-center gap-1.5 ml-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Cashout
          </span>
        </div>
      </div>

      {/* Main Graph Canvas */}
      <div className="relative rounded-3xl border border-zinc-800/80 overflow-hidden bg-black/80 h-[560px] shadow-2xl">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto" />
              <p className="text-xs font-black uppercase text-zinc-400 tracking-wider">
                Computing Cross-Case Mule Clusters...
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={filteredNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.8}
          >
            <Background color="#27272a" gap={20} size={1} />
            <Controls className="!bg-zinc-900 !border-zinc-800 !text-white !fill-white" />
          </ReactFlow>
        )}

        {/* Node Inspector Drawer */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-4 w-80 p-5 rounded-2xl bg-zinc-950/95 border border-purple-500/40 shadow-2xl backdrop-blur-xl z-30 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div>
                  <span className="text-[8px] font-black uppercase text-purple-400 block">
                    Account Intelligence
                  </span>
                  <h3 className="text-sm font-black text-white font-mono">
                    {selectedNode.masked_account}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-xs text-zinc-500 hover:text-white px-2 py-1 rounded-lg border border-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500 font-bold uppercase text-[9px]">Classification:</span>
                  <span className="font-black text-purple-300">{selectedNode.node_type}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500 font-bold uppercase text-[9px]">Bank / IFSC:</span>
                  <span className="font-mono text-zinc-200">{selectedNode.bank_name} ({selectedNode.bank_ifsc})</span>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500 font-bold uppercase text-[9px]">Total Fraud Volume:</span>
                  <span className="font-black text-orange-400">
                    ₹{Number(selectedNode.total_volume).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500 font-bold uppercase text-[9px]">Risk Score:</span>
                  <span className="font-black text-red-400">
                    {(Number(selectedNode.risk_score) * 100).toFixed(0)}% (Critical)
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span className="text-zinc-500 font-bold uppercase text-[9px]">Linked NCRP Cases:</span>
                  <span className="font-black text-white bg-red-600/30 px-2 py-0.5 rounded-full text-[10px]">
                    {selectedNode.complaint_count} Complaints
                  </span>
                </div>

                {selectedNode.complaints && selectedNode.complaints.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[9px] font-black uppercase text-zinc-500 block mb-1">
                      Associated Case Files:
                    </span>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {selectedNode.complaints.map((c, i) => (
                        <div
                          key={i}
                          className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 font-mono text-[9px] text-zinc-300"
                        >
                          #{c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-900 space-y-2">
                <button
                  type="button"
                  onClick={() => alert(`Direct administrative freeze dispatched for account ${selectedNode.masked_account}`)}
                  className="w-full py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Execute Nodal Freeze</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MuleNetworkIntelligence;
