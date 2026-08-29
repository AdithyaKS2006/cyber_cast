import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import Button from './Button';
import toast from 'react-hot-toast';

const DataTable = ({ columns, data, pageSize = 15, onRowClick, selectable = false }) => {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');

  // Reset page when search or data changes
  useEffect(() => {
    setPage(1);
  }, [search, data]);

  // Filter data based on search input
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const lowerSearch = search.toLowerCase();
    return data.filter(row => {
      return columns.some(col => {
        const val = row[col.key];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, columns, search]);

  // Sort data based on sortKey and sortDir
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // Handle null/undefined values
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        return sortDir === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortDir === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
    });
    return sorted;
  }, [filteredData, sortKey, sortDir]);

  // Paginate sorted data
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, page, pageSize]);

  // Total pages
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  // Toggle selection for single row
  const toggleSelectRow = (e, rowId) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  // Toggle selection for all rows on the active page
  const toggleSelectAll = (e) => {
    const activePageIds = paginatedData.map((row, idx) => row.id || idx);
    const allSelected = activePageIds.every(id => selected.has(id));

    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) {
        activePageIds.forEach(id => next.delete(id));
      } else {
        activePageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const exportCSV = () => {
    if (data.length === 0) {
      toast.error('No logs available to export.');
      return;
    }
    const headers = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row => 
      columns.map(c => {
        const val = row[c.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exported_cyber_logs.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  // Indexes for displaying in pagination
  const startIndex = sortedData.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, sortedData.length);

  return (
    <div className="space-y-4 font-mono uppercase text-[10px]">
      
      {/* Top Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="FILTER TELEMETRY ENTRIES..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-orange-400 placeholder-zinc-600 outline-none focus:border-orange-500/50 font-bold"
          />
        </div>

        {/* Export Button */}
        <Button
          onClick={exportCSV}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-[9px] font-black"
        >
          <Download className="w-3.5 h-3.5" />
          <span>EXPORT CSV</span>
        </Button>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto w-full border border-zinc-800 rounded-xl custom-scrollbar">
        <table className="w-full border-collapse text-left bg-black/20">
          
          {/* Header */}
          <thead>
            <tr className="bg-black/60 border-b border-zinc-800 text-[8px] font-black text-zinc-500">
              {selectable && (
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && paginatedData.every((row, idx) => selected.has(row.id || idx))}
                    onChange={toggleSelectAll}
                    className="accent-orange-500 cursor-pointer rounded"
                  />
                </th>
              )}
              {columns.map(col => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="p-3 cursor-pointer select-none hover:text-orange-400 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      <div className="flex flex-col text-[6px]">
                        {isSorted && sortDir === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-orange-400" />
                        ) : isSorted && sortDir === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-orange-400" />
                        ) : (
                          <div className="flex flex-col leading-[3px]">
                            <span>▲</span>
                            <span>▼</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-zinc-800/40">
            {paginatedData.map((row, rowIdx) => {
              const rowId = row.id || rowIdx;
              const isSelected = selected.has(rowId);
              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-orange-950/10 transition-all cursor-pointer 
                    ${isSelected ? 'bg-orange-950/20' : ''}`}
                >
                  {selectable && (
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectRow(e, rowId)}
                        className="accent-orange-500 cursor-pointer rounded"
                      />
                    </td>
                  )}
                  {columns.map(col => {
                    const cellVal = row[col.key];
                    return (
                      <td key={col.key} className="p-3 text-zinc-300 font-medium">
                        {col.render ? col.render(cellVal, row) : cellVal}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="p-12 text-center text-zinc-600 font-bold italic"
                >
                  NO RECORDS FOUND FOR THE SPECIFIED QUERY.
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center text-[8.5px] font-black text-zinc-500 pt-2">
        
        {/* Info */}
        <div>
          <span>SHOWING {startIndex}–{endIndex} OF {sortedData.length} TOTAL ENTRIES</span>
        </div>

        {/* Pages */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-2 rounded bg-zinc-950 border border-zinc-800 text-orange-400 hover:bg-orange-500 hover:text-black transition-all disabled:opacity-30 disabled:hover:bg-zinc-950 disabled:hover:text-orange-400"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              const isCurrent = page === pNum;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`px-3 py-1.5 rounded font-black border transition-all
                    ${isCurrent 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 border-orange-400 text-black font-black shadow-md' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-orange-400'}`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="p-2 rounded bg-zinc-950 border border-zinc-800 text-orange-400 hover:bg-orange-500 hover:text-black transition-all disabled:opacity-30 disabled:hover:bg-zinc-950 disabled:hover:text-orange-400"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};

export default React.memo(DataTable);
