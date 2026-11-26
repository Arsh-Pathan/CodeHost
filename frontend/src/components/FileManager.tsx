"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  File, 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  Trash2, 
  Save, 
  Plus, 
  Loader2,
  RefreshCw,
  FolderPlus
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileItem[];
  updatedAt?: string;
}

interface FileManagerProps {
  projectId: string;
}

export default function FileManager({ projectId }: FileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [savedContent, setSavedContent] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileLoadError, setFileLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'switch' | 'delete'; path: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Creation States
  const [showCreateModal, setShowCreateModal] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [targetPath, setTargetPath] = useState('');

  const isDirty = Boolean(selectedFile) && !isLoadingFile && !fileLoadError && fileContent !== savedContent;

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/files/${projectId}`);
      setFiles(res.files);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to list files' });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchFiles();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchFiles]);

  const loadFileContent = async (path: string, force = false) => {
    if (!force && isDirty && selectedFile !== path) {
      setPendingAction({ type: 'switch', path });
      return;
    }
    try {
      setPendingAction(null);
      setStatusMessage(null);
      setSelectedFile(path);
      setIsLoadingFile(true);
      setFileLoadError(null);
      setFileContent('');
      setSavedContent('');
      const res = await fetchApi(`/files/${projectId}/content?filePath=${encodeURIComponent(path)}`);
      setFileContent(res.content);
      setSavedContent(res.content);
    } catch (err: unknown) {
      setFileLoadError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const saveFile = async () => {
    if (!selectedFile || isLoadingFile || fileLoadError) return;
    try {
      setSaving(true);
      setStatusMessage(null);
      await fetchApi(`/files/${projectId}`, {
        method: 'POST',
        body: JSON.stringify({ filePath: selectedFile, content: fileContent })
      });
      setSavedContent(fileContent);
      setStatusMessage({ type: 'success', text: `Saved ${selectedFile}` });
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save file' });
    } finally {
      setSaving(false);
    }
  };

  const deleteFile = async (path: string, confirmed = false) => {
    if (!confirmed) {
      setPendingAction({ type: 'delete', path });
      return;
    }
    try {
      setPendingAction(null);
      setStatusMessage(null);
      await fetchApi(`/files/${projectId}?filePath=${encodeURIComponent(path)}`, { method: 'DELETE' });
      if (selectedFile === path) {
        setSelectedFile(null);
        setFileContent('');
        setSavedContent('');
      }
      setStatusMessage({ type: 'success', text: `Deleted ${path}` });
      void fetchFiles();
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' });
    }
  };

  const deploy = async () => {
    try {
      setIsDeploying(true);
      setStatusMessage(null);
      await fetchApi(`/files/${projectId}/deploy`, { method: 'POST' });
      setStatusMessage({ type: 'success', text: 'Deployment queued!' });
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Deploy failed' });
    } finally {
      setIsDeploying(false);
    }
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) newExpanded.delete(path);
    else newExpanded.add(path);
    setExpandedFolders(newExpanded);
  };

  const handleCreate = async () => {
    if (!newItemName) return;
    try {
      setSaving(true);
      setStatusMessage(null);
      const filePath = targetPath ? `${targetPath}/${newItemName}` : newItemName;
      
      if (showCreateModal === 'file') {
        await fetchApi(`/files/${projectId}`, {
          method: 'POST',
          body: JSON.stringify({ filePath, content: '' })
        });
      } else {
        await fetchApi(`/files/${projectId}`, {
          method: 'POST',
          body: JSON.stringify({ filePath: `${filePath}/.keep`, content: '' })
        });
      }
      
      setShowCreateModal(null);
      setNewItemName('');
      await fetchFiles();
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create item' });
    } finally {
      setSaving(false);
    }
  };

  const renderTree = (items: FileItem[], depth = 0) => {
    return items.map((item) => (
      <div key={item.path}>
        <div 
          className={`group flex items-center py-1.5 px-3 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors ${selectedFile === item.path ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => item.type === 'directory' ? toggleFolder(item.path) : loadFileContent(item.path)}
        >
          {item.type === 'directory' ? (
            expandedFolders.has(item.path) ? <ChevronDown size={14} className="mr-2" /> : <ChevronRight size={14} className="mr-2" />
          ) : (
            <FileCode size={14} className={`mr-2 ${selectedFile === item.path ? 'text-blue-500' : 'text-slate-400'}`} />
          )}
          
          <span className="text-sm font-medium truncate flex-1">{item.name}</span>
          
          <div className="hidden group-hover:flex items-center space-x-1">
             <button 
              onClick={(e) => { e.stopPropagation(); deleteFile(item.path); }}
              className="p-1 text-slate-400 hover:text-red-500 rounded"
             >
               <Trash2 size={12} />
             </button>
          </div>
        </div>
        
        {item.type === 'directory' && expandedFolders.has(item.path) && item.children && (
          <div>{renderTree(item.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex h-[600px]">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Files</h4>
           <div className="flex items-center space-x-1">
              <button 
                onClick={() => { setTargetPath(''); setShowCreateModal('file'); }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400" 
                title="New File"
              >
                <Plus size={14} />
              </button>
              <button 
                onClick={() => { setTargetPath(''); setShowCreateModal('folder'); }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400" 
                title="New Folder"
              >
                <FolderPlus size={14} />
              </button>
              <button onClick={fetchFiles} className="p-1 hover:bg-slate-100 rounded text-slate-400" title="Refresh">
                <RefreshCw size={14} />
              </button>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
           {loading ? (
             <div className="h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
           ) : (
             renderTree(files)
           )}
           {files.length === 0 && !loading && (
             <div className="p-4 text-center text-xs text-slate-400 italic">No files found. Upload a zip to start.</div>
           )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col bg-slate-50/30">
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="ml-4 font-black opacity-70 hover:opacity-100 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
        {pendingAction && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-4 text-xs">
            <span className="font-bold text-amber-900">
              {pendingAction.type === 'delete'
                ? `Permanently delete "${pendingAction.path}"?`
                : `You have unsaved changes in "${selectedFile}". Discard and switch to "${pendingAction.path}"?`}
            </span>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingAction.type === 'delete') {
                    void deleteFile(pendingAction.path, true);
                  } else {
                    void loadFileContent(pendingAction.path, true);
                  }
                }}
                className="px-3 py-1 rounded-lg bg-amber-900 text-white font-bold hover:bg-amber-800 cursor-pointer"
              >
                {pendingAction.type === 'delete' ? 'Confirm Delete' : 'Discard Changes'}
              </button>
            </div>
          </div>
        )}
        {selectedFile ? (
          <>
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                 <File size={16} className="text-blue-500" />
                 <span className="text-sm font-bold text-slate-900">{selectedFile}</span>
                 {isDirty && (
                   <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                     Unsaved
                   </span>
                 )}
              </div>
              <div className="flex items-center space-x-2">
                 <button 
                  onClick={saveFile}
                  disabled={saving || isLoadingFile || Boolean(fileLoadError)}
                  className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 disabled:opacity-50 transition-all shadow-sm"
                 >
                   {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                   <span>Save Changes</span>
                 </button>
                 <button 
                  onClick={deploy}
                  disabled={isDeploying}
                  className="flex items-center space-x-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-sm"
                 >
                   {isDeploying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                   <span>Deploy</span>
                 </button>
              </div>
            </div>
            <div className="flex-1 relative">
              <textarea 
                value={isLoadingFile ? 'Loading...' : fileLoadError ? `Error: ${fileLoadError}` : fileContent}
                readOnly={isLoadingFile || Boolean(fileLoadError)}
                onChange={(e) => setFileContent(e.target.value)}
                className="absolute inset-0 w-full h-full p-8 font-mono text-sm bg-transparent outline-none resize-none text-slate-700 leading-relaxed"
                spellCheck={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
             <FileCode size={48} className="mb-4 opacity-20" />
             <p className="text-sm font-medium">Select a file to edit</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl p-8 shadow-2xl w-[400px] border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 mb-2">Create New {showCreateModal === 'file' ? 'File' : 'Folder'}</h3>
              <p className="text-xs text-slate-500 mb-6">Enter a name for your new {showCreateModal}.</p>
              
              <input 
                 autoFocus
                 type="text" 
                 placeholder={`my-${showCreateModal}${showCreateModal === 'file' ? '.js' : ''}`}
                 className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-6"
                 value={newItemName}
                 onChange={(e) => setNewItemName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              
              <div className="flex items-center space-x-3">
                 <button 
                   onClick={() => setShowCreateModal(null)}
                   className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                 >
                   Cancel
                 </button>
                 <button 
                    onClick={handleCreate}
                    disabled={saving || !newItemName}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                 >
                    {saving ? <Loader2 size={14} className="animate-spin inline mr-2" /> : 'Create'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
