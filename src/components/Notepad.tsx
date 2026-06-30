import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';

interface NotepadProps {
  token: string | null;
  onStatsChange?: (stats: { totalCharacters: number; totalWords: number; notesCount: number }) => void;
}

export default function Notepad({ token, onStatsChange }: NotepadProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [isDirty, setIsDirty] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{ id: string; title: string } | null>(null);

  // Send stats up to parent whenever notes or content changes
  useEffect(() => {
    const totalCharacters = notes.reduce((sum, n) => sum + (n.id === activeNoteId ? content.length : (n.content || '').length), 0);
    const totalWords = notes.reduce((sum, n) => {
      const text = n.id === activeNoteId ? content : (n.content || '');
      const cleanText = text.trim();
      return sum + (cleanText ? cleanText.split(/\s+/).length : 0);
    }, 0);
    
    if (onStatsChange) {
      onStatsChange({
        totalCharacters,
        totalWords,
        notesCount: notes.length
      });
    }
  }, [notes, activeNoteId, content, onStatsChange]);

  // Keep refs up to date for keyboard handler
  const activeNoteIdRef = useRef(activeNoteId);
  const titleRef = useRef(title);
  const contentRef = useRef(content);

  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
    titleRef.current = title;
    contentRef.current = content;
  }, [activeNoteId, title, content]);

  // Load notes on mount or token change
  const fetchNotes = async (selectNoteId?: string) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/notes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data: Note[] = await res.json();
        setNotes(data);
        
        if (data.length > 0) {
          // If we requested to select a specific note, select it, otherwise first note
          const toSelect = selectNoteId && data.some(n => n.id === selectNoteId)
            ? data.find(n => n.id === selectNoteId)!
            : data[0];
            
          setActiveNoteId(toSelect.id);
          setTitle(toSelect.title || '');
          setContent(toSelect.content || '');
          setIsDirty(false);
          setStatus('Loaded ' + toSelect.title);
        } else {
          setActiveNoteId(null);
          setTitle('');
          setContent('');
          setIsDirty(false);
          setStatus('No notes available.');
        }
      } else {
        setStatus('Failed to load notes.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Error loading notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [token]);

  // Handle switching active note from list
  const handleSelectNote = async (noteId: string) => {
    if (isDirty && activeNoteId) {
      // Auto-save current active note to avoid prompts
      try {
        await fetch(`/notes/${activeNoteId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title,
            content: content
          }),
        });
        // Update local notes array immediately
        setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, title, content } : n));
      } catch (e) {
        console.error("Auto-save failed on note switch", e);
      }
    }
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setActiveNoteId(note.id);
      setTitle(note.title);
      setContent(note.content);
      setIsDirty(false);
      setStatus('Switched to ' + note.title);
    }
  };

  // Create a new note
  const handleNewNote = async () => {
    if (!token) return;
    try {
      setStatus('Creating new note...');
      const res = await fetch('/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Untitled Note',
          content: ''
        }),
      });

      if (res.ok) {
        const newNote: Note = await res.json();
        await fetchNotes(newNote.id);
        setStatus('Created ' + newNote.title);
      } else {
        setStatus('Error: Could not create note.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Network error creating note.');
    }
  };

  // Save note changes
  const handleSave = async () => {
    if (!token || !activeNoteIdRef.current) return;
    setSaving(true);
    setStatus('Saving...');
    try {
      const res = await fetch(`/notes/${activeNoteIdRef.current}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: titleRef.current,
          content: contentRef.current
        }),
      });

      if (res.ok) {
        const updated: Note = await res.json();
        setIsDirty(false);
        setStatus('Saved successfully at ' + new Date().toLocaleTimeString());
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      } else {
        setStatus('Error: Could not save note.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Network error saving note.');
    } finally {
      setSaving(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (idToDelete: string) => {
    if (!token) return;
    try {
      setStatus('Deleting note...');
      const res = await fetch(`/notes/${idToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setStatus('Deleted successfully.');
        if (idToDelete === activeNoteId) {
          // Select another note or clear editor if we deleted the active note
          await fetchNotes();
        } else {
          // If a background note was deleted, just filter it out locally to preserve active typing state
          setNotes(prev => prev.filter(n => n.id !== idToDelete));
        }
      } else {
        setStatus('Error deleting note.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Network error deleting note.');
    }
  };

  // Keyboard shortcut Ctrl+S or Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [token]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsDirty(true);
    setStatus('Unsaved changes... Press Ctrl+S');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
    setStatus('Unsaved changes... Press Ctrl+S');
  };

  // Calculate stats
  const totalCharacters = notes.reduce((sum, n) => sum + (n.id === activeNoteId ? content.length : (n.content || '').length), 0);
  const totalWords = notes.reduce((sum, n) => {
    const text = n.id === activeNoteId ? content : (n.content || '');
    const cleanText = text.trim();
    return sum + (cleanText ? cleanText.split(/\s+/).length : 0);
  }, 0);

  // Filter notes based on search query
  const filteredNotes = notes.filter(n => {
    const query = searchQuery.toLowerCase();
    const noteTitle = (n.title || '').toLowerCase();
    const noteContent = n.id === activeNoteId ? content.toLowerCase() : (n.content || '').toLowerCase();
    return noteTitle.includes(query) || noteContent.includes(query);
  });

  return (
    <div className="bg-[#c0c0c0] p-2.5 border-outset font-pixel text-black select-none flex flex-col gap-3">
      
      {/* Main dual-pane workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 min-h-[360px] items-stretch">
        
        {/* Left sidebar: File note explorer */}
        <div className="md:col-span-4 bg-[#dfdfdf] border-inset p-2 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-[#808080] pb-1.5">
            <span className="font-bold text-xs flex items-center gap-1.5">
              📁 Files Explorer
            </span>
            <button
              onClick={handleNewNote}
              className="px-2.5 py-0.5 bg-[#c0c0c0] text-[11px] font-bold border-outset cursor-pointer select-none active:border-inset whitespace-nowrap text-green-800"
              title="Create new note"
            >
              📄 + NEW
            </button>
          </div>

          {/* Search bar inside sidebar */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold">Search:</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white text-black border-inset px-1.5 py-0.5 text-xs font-pixel outline-hidden grow h-6"
              placeholder="Filter files..."
            />
          </div>

          {/* List of notes */}
          <div className="grow overflow-y-auto max-h-[250px] md:max-h-[350px] bg-white border-inset p-1 flex flex-col gap-0.5">
            {loading && notes.length === 0 ? (
              <div className="p-4 text-center text-gray-500 font-bold text-xs italic">
                Loading notes...
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-[11px] italic leading-tight">
                {searchQuery ? 'No search results found.' : 'No notes found. Click NEW.'}
              </div>
            ) : (
              filteredNotes.map((n) => {
                const isActive = n.id === activeNoteId;
                const formattedDate = n.updated_at 
                  ? new Date(n.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';
                
                return (
                  <div
                    key={n.id}
                    onClick={() => handleSelectNote(n.id)}
                    className={`p-1.5 flex items-center justify-between gap-1.5 cursor-pointer border border-transparent hover:border-[#808080] select-none ${
                      isActive 
                        ? 'bg-[#000080] text-white font-bold' 
                        : 'bg-transparent text-black'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 grow">
                      <span className="text-base shrink-0">{isActive ? '📝' : '📄'}</span>
                      <div className="truncate min-w-0">
                        <span className="text-xs block truncate leading-tight">
                          {n.title || 'Untitled Note'}
                        </span>
                        <span className={`text-[9px] block leading-none mt-0.5 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                          Last modified: {formattedDate || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete({ id: n.id, title: n.title || 'Untitled Note' });
                      }}
                      className={`text-[9px] w-5 h-5 flex items-center justify-center border bg-[#c0c0c0] font-bold cursor-pointer text-red-800 ${
                        isActive ? 'text-black border-white' : 'border-[#808080]'
                      }`}
                      title="Delete Note"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right pane: Core Notepad Editor */}
        <div className="md:col-span-8 bg-[#dfdfdf] border-inset p-2 flex flex-col gap-2">
          {activeNoteId ? (
            <>
              {/* Header inside editor */}
              <div className="flex items-center justify-between border-b border-[#808080] pb-1.5">
                <span className="font-bold text-xs flex items-center gap-1.5 text-[#000080]">
                  📝 StickyNote.exe
                  {isDirty && (
                    <span className="text-red-700 font-bold animate-pulse text-[9px] border border-red-400 px-1.5 py-0.2 bg-red-100">
                      Modified
                    </span>
                  )}
                </span>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3.5 py-1 bg-[#c0c0c0] text-xs font-bold border-outset cursor-pointer select-none active:border-inset disabled:opacity-40"
                >
                  SAVE (Ctrl+S)
                </button>
              </div>

              {/* Edit Title field */}
              <div className="flex items-center gap-1.5 bg-[#ffffcc] p-1 border-inset">
                <span className="text-xs font-bold pl-1 text-gray-800">Title:</span>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  disabled={saving}
                  className="bg-transparent text-black font-bold font-pixel outline-hidden grow text-xs h-6 border-0 focus:ring-0"
                  placeholder="Note Title"
                />
              </div>

              {/* Textarea */}
              <div className="grow relative">
                <textarea
                  value={content}
                  onChange={handleTextChange}
                  disabled={saving}
                  className="w-full h-full min-h-[220px] md:min-h-[280px] p-2.5 text-xs font-mono border-inset bg-[#ffffcc] text-black outline-hidden leading-tight block resize-none"
                  placeholder="Type notes here... Press Ctrl+S or click Save above to save."
                  spellCheck="false"
                />
              </div>
            </>
          ) : (
            <div className="grow flex flex-col items-center justify-center bg-[#ffffcc] border-inset p-6 text-center text-gray-400 font-bold text-xs">
              <span>No note currently selected.</span>
              <button
                onClick={handleNewNote}
                className="mt-3 px-4 py-1.5 bg-[#c0c0c0] text-xs font-pixel font-bold border-outset active:border-inset text-black"
              >
                Create a Note
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Notepad Status Bar */}
      <div className="px-1.5 py-0.5 bg-[#dfdfdf] border-inset text-[10px] sm:text-xs flex justify-between select-none font-bold">
        <span className="truncate max-w-[70%] text-gray-700">{status}</span>
        <span className="text-gray-600">Active Note Chars: {content.length}</span>
      </div>

      {/* Custom Note Deletion Confirmation dialog */}
      {noteToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 font-pixel text-black select-none">
          <div className="w-80 p-[3px] bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#000000] border-b-[#000000] shadow-2xl">
            {/* Title bar */}
            <div className="bg-[#000080] px-2 py-1 flex items-center justify-between text-white font-bold text-xs">
              <span className="flex items-center gap-1.5">🗄️ System Query</span>
              <button
                onClick={() => setNoteToDelete(null)}
                className="w-4 h-4 bg-[#c0c0c0] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] font-pixel text-[10px] font-bold flex items-center justify-center cursor-pointer text-black"
              >
                ✕
              </button>
            </div>

            {/* Content box */}
            <div className="p-4 flex gap-3.5 bg-[#dfdfdf] items-start">
              <span className="text-3xl shrink-0">❓</span>
              <div className="flex-1 text-xs text-left">
                <p className="font-bold mb-1 text-black text-left">Delete Notepad block?</p>
                <p className="text-[11px] leading-tight text-gray-700 text-left">
                  Are you sure you want to permanently delete note <span className="font-bold text-red-900">"{noteToDelete.title}"</span>? This cannot be undone.
                </p>
              </div>
            </div>

            {/* Actions panel */}
            <div className="bg-[#dfdfdf] px-3 pb-3 flex justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  const id = noteToDelete.id;
                  setNoteToDelete(null);
                  handleDeleteNote(id);
                }}
                className="px-4 py-1.5 bg-[#c0c0c0] font-bold border-outset cursor-pointer select-none active:border-inset text-red-800"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-1.5 bg-[#c0c0c0] font-bold border-outset cursor-pointer select-none active:border-inset text-black"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
