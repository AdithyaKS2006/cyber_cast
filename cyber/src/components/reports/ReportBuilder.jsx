import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Save, FileText, PieChart, LayoutList, AlignLeft } from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import apiClient from '../../utils/apiClient';

// --- Sortable Item Component ---
const SortableItem = ({ id, item, onRemove, onUpdate }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const getIcon = () => {
    switch (item.type) {
      case 'header': return <FileText className="w-5 h-5 text-orange-400" />;
      case 'text': return <AlignLeft className="w-5 h-5 text-orange-400" />;
      case 'chart': return <PieChart className="w-5 h-5 text-orange-400" />;
      case 'list': return <LayoutList className="w-5 h-5 text-orange-400" />;
      default: return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-3 flex items-start gap-4">
      <div {...attributes} {...listeners} className="cursor-grab mt-1 hover:text-orange-400 text-zinc-500">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800">
          {getIcon()}
          <span className="font-bold text-white uppercase text-xs tracking-widest">{item.type} Section</span>
        </div>
        
        {item.type === 'header' && (
          <input 
            type="text" 
            value={item.content.title || ''} 
            onChange={(e) => onUpdate(id, { ...item.content, title: e.target.value })}
            placeholder="Report Title..."
            className="w-full bg-black border border-zinc-800 rounded p-2 text-white font-black text-xl placeholder:text-zinc-700 outline-none focus:border-orange-500"
          />
        )}
        
        {item.type === 'text' && (
          <textarea 
            value={item.content.text || ''} 
            onChange={(e) => onUpdate(id, { ...item.content, text: e.target.value })}
            placeholder="Executive summary or detailed notes..."
            rows={3}
            className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 text-sm placeholder:text-zinc-700 outline-none focus:border-orange-500"
          />
        )}

        {item.type === 'chart' && (
          <select 
            value={item.content.chartType || 'threat_timeline'} 
            onChange={(e) => onUpdate(id, { ...item.content, chartType: e.target.value })}
            className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-sm outline-none focus:border-orange-500"
          >
            <option value="threat_timeline">Threat Timeline (Line)</option>
            <option value="severity_dist">Severity Distribution (Pie)</option>
            <option value="attack_vectors">Attack Vectors (Bar)</option>
          </select>
        )}
        
        {item.type === 'list' && (
          <div className="space-y-2">
            <input 
              type="text" 
              value={item.content.filter || ''} 
              onChange={(e) => onUpdate(id, { ...item.content, filter: e.target.value })}
              placeholder="e.g. status=active"
              className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-sm placeholder:text-zinc-700 outline-none focus:border-orange-500"
            />
            <p className="text-[10px] text-zinc-500 uppercase">Data Source: Indicators of Compromise</p>
          </div>
        )}
      </div>

      <button onClick={() => onRemove(id)} className="p-2 text-zinc-500 hover:text-rose-500 transition-colors">
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
};

// --- Main Builder Component ---
const ReportBuilder = () => {
  const [sections, setSections] = useState([
    { id: '1', type: 'header', content: { title: 'Weekly Threat Intelligence Report' } },
    { id: '2', type: 'text', content: { text: 'This report summarizes the threat landscape...' } },
  ]);
  const [reportName, setReportName] = useState('New Report Template');
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addSection = (type) => {
    const newSection = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: {}
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (id) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id, newContent) => {
    setSections(sections.map(s => s.id === id ? { ...s, content: newContent } : s));
  };

  const saveReportTemplate = async () => {
    if (sections.length === 0) {
      toast.error('Cannot save empty report');
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await apiClient('/api/v1/analytics/reports/templates/', {
        method: 'POST',
        body: JSON.stringify({
          name: reportName,
          layout: sections
        })
      });
      if (response.ok) {
        toast.success('Template saved successfully');
      } else {
        toast.error('Failed to save template');
      }
    } catch (err) {
      toast.error('Network error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex gap-6">
      
      {/* Editor Pane */}
      <div className="flex-1 flex flex-col bg-black/40 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-black/60 flex justify-between items-center">
          <input 
            type="text"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className="bg-transparent text-lg font-black text-white uppercase tracking-wider outline-none border-b border-transparent focus:border-orange-500 w-1/2 transition-colors"
          />
          <Button onClick={saveReportTemplate} disabled={isSaving} size="sm" className="gap-2">
            <Save className="w-4 h-4" /> Save Layout
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map(section => (
                <SortableItem 
                  key={section.id} 
                  id={section.id} 
                  item={section} 
                  onRemove={removeSection}
                  onUpdate={updateSection}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add Section Controls */}
          <div className="mt-8 border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Add Report Module</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => addSection('header')} className="flex items-center gap-2 px-4 py-2 bg-orange-950/20 text-orange-400 rounded hover:bg-orange-950/40 text-xs font-bold uppercase transition-colors">
                <FileText className="w-4 h-4" /> Header
              </button>
              <button onClick={() => addSection('text')} className="flex items-center gap-2 px-4 py-2 bg-orange-950/20 text-orange-400 rounded hover:bg-orange-950/40 text-xs font-bold uppercase transition-colors">
                <AlignLeft className="w-4 h-4" /> Text Block
              </button>
              <button onClick={() => addSection('chart')} className="flex items-center gap-2 px-4 py-2 bg-orange-950/20 text-orange-400 rounded hover:bg-orange-950/40 text-xs font-bold uppercase transition-colors">
                <PieChart className="w-4 h-4" /> Chart
              </button>
              <button onClick={() => addSection('list')} className="flex items-center gap-2 px-4 py-2 bg-orange-950/20 text-orange-400 rounded hover:bg-orange-950/40 text-xs font-bold uppercase transition-colors">
                <LayoutList className="w-4 h-4" /> Data List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview/Render Pane */}
      <div className="w-1/3 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col hidden lg:flex">
        <div className="p-4 border-b border-zinc-800 bg-black text-xs font-black text-orange-400 uppercase tracking-widest">
          Document Preview
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-white text-black font-sans">
          {sections.map((section) => (
            <div key={section.id} className="mb-6">
              {section.type === 'header' && (
                <h1 className="text-3xl font-bold border-b-2 border-black pb-2">{section.content.title || 'Untitled'}</h1>
              )}
              {section.type === 'text' && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">{section.content.text || '...'}</p>
              )}
              {section.type === 'chart' && (
                <div className="h-32 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs uppercase tracking-wider">
                  [{section.content.chartType || 'Chart'} Placeholder]
                </div>
              )}
              {section.type === 'list' && (
                <div className="space-y-2">
                  <div className="bg-gray-100 border border-gray-300 p-2 text-xs flex justify-between"><span>Indicator 1</span><span className="text-red-500">High</span></div>
                  <div className="bg-gray-100 border border-gray-300 p-2 text-xs flex justify-between"><span>Indicator 2</span><span className="text-yellow-500">Medium</span></div>
                </div>
              )}
            </div>
          ))}
          {sections.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Empty Document
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
