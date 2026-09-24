import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { RefreshCw, Lock, AlertCircle, Info } from 'lucide-react';
import apiClient from '../../utils/apiClient';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 30,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

// Custom Node Component
const MuleNode = ({ data }) => {
  const isVictim = data.node_type === 'VICTIM';
  const isMule = data.node_type === 'CONFIRMED_MULE';
  const isFrozen = data.freeze_status === 'FROZEN';

  const formatAmount = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  return (
    <div className={`
      px-3 py-2 rounded-xl border-2 min-w-[160px] shadow-lg relative bg-zinc-950 backdrop-blur-md
      ${isVictim ? 'border-blue-500 shadow-blue-500/20' : 
        isMule ? 'border-purple-500 shadow-purple-500/20' : 
        'border-orange-500 shadow-orange-500/20'}
    `}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 rounded-full !bg-zinc-600 border-none" />
      
      {isFrozen && (
        <div className="absolute -top-3 -right-3 bg-emerald-500 w-6 h-6 rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-md">
          <Lock className="w-3 h-3 text-zinc-950" />
        </div>
      )}

      <div className="flex flex-col">
        <span className={`text-[9px] font-black uppercase tracking-widest ${
          isVictim ? 'text-blue-400' : isMule ? 'text-purple-400' : 'text-orange-400'
        }`}>
          {data.node_type}
        </span>
        <span className="text-xs font-bold text-zinc-100 truncate mt-1">
          {data.bank_ifsc || 'Unknown Bank'}
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">
          ...{data.account_hash ? data.account_hash.slice(-6) : 'XXXXXX'}
        </span>
        {data.total_volume > 0 && (
          <span className="text-[10px] text-zinc-400 mt-2 border-t border-zinc-800 pt-1">
            Vol: <strong className="text-emerald-400 font-mono">{formatAmount(data.total_volume)}</strong>
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 rounded-full !bg-zinc-600 border-none" />
    </div>
  );
};

const nodeTypes = {
  muleNode: MuleNode,
};

const MoneyTrailGraph = ({ complaintId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGraphData = async () => {
    if (!complaintId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient(`/api/v2/graph/complaint/${complaintId}/`);
      if (!response.ok) {
        throw new Error(`Failed to load graph data`);
      }
      const data = await response.json();
      
      const rfNodes = data.nodes.map(n => ({
        id: n.id,
        type: 'muleNode',
        data: n,
        position: { x: 0, y: 0 } // initial position before layout
      }));

      const rfEdges = data.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: `₹${e.amount}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#f97316', strokeWidth: 2 },
        labelStyle: { fill: '#f97316', fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: '#0a0a0a' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' }
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges);
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (err) {
      console.error('Error fetching graph telemetry:', err);
      setError('Unable to retrieve transaction money trail graph.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [complaintId]);

  return (
    <div className="glass-card rounded-xl p-5 border border-zinc-800 bg-zinc-950/80 backdrop-blur-md shadow-2xl relative overflow-hidden h-[550px] flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/80 mb-4 shrink-0">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            Multi-Hop Transaction Topology
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
              React Flow Network
            </span>
          </h3>
          <p className="text-xs text-zinc-400">
            Real-time layer tracing from Victim accounts through mule accounts.
          </p>
        </div>
      </div>

      <div className="flex-1 relative rounded-lg border border-zinc-900 bg-zinc-950 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
            <span>Analyzing transaction telemetry graph...</span>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-red-400 text-xs px-4 py-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 py-16 text-sm">
            <Info className="w-8 h-8 text-zinc-600" />
            <span className="font-semibold text-zinc-400">No transaction graph available yet</span>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            className="dark"
          >
            <Background color="#333" gap={16} />
            <Controls />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

export default MoneyTrailGraph;
