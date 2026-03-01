import React, { useState, useEffect } from 'react';
import { 
  File, 
  Folder, 
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
  const [saving, setSaving] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [isDeploying, setIsDeploying] = useState(false);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/files/${projectId}`);
      setFiles(res.files);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const loadFileContent = async (path: string) => {
    try {
      setSelectedFile(path);
      setFileContent('Loading...');
      const res = await fetchApi(`/files/${projectId}/content?filePath=${path}`);
      setFileContent(res.content);
    } catch (err) {
      setFileContent('Error loading file');
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    try {
      setSaving(true);
      await fetchApi(`/files/${projectId}`, {
        method: 'POST',
        body: JSON.stringify({ filePath: selectedFile, content: fileContent })
      });
    } catch (err) {
      alert('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const deleteFile = async (path: string) => {
    if (!confirm(`Delete ${path}?`)) return;
    try {
      await fetchApi(`/files/${projectId}?filePath=${path}`, { method: 'DELETE' });
      if (selectedFile === path) {
        setSelectedFile(null);
        setFileContent('');
      }
      fetchFiles();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const deploy = async () => {
    try {
      setIsDeploying(true);
      await fetchApi(`/files/${projectId}/deploy`, { method: 'POST' });
      alert('Deployment queued!');
    } catch (err) {
      alert('Deploy failed');
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
              <button onClick={fetchFiles} className="p-1 hover:bg-slate-100 rounded text-slate-400"><RefreshCw size={14} /></button>
              <button className="p-1 hover:bg-slate-100 rounded text-slate-400"><Plus size={14} /></button>
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
        {selectedFile ? (
          <>
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                 <File size={16} className="text-blue-500" />
                 <span className="text-sm font-bold text-slate-900">{selectedFile}</span>
              </div>
              <div className="flex items-center space-x-2">
                 <button 
                  onClick={saveFile}
                  disabled={saving}
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
                value={fileContent}
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
    </div>
  );
}
