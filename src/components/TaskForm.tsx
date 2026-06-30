import React, { useState } from 'react';

interface TaskFormProps {
  onAddTask: (title: string, description: string, priority: number) => Promise<void>;
}

export default function TaskForm({ onAddTask }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(2); // 2 = Medium
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task Title is required.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onAddTask(title, description, priority);
      setTitle('');
      setDescription('');
      setPriority(2); // reset to Medium
    } catch (err: any) {
      setError(err.message || 'Failed to add task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-pixel text-black select-none">
      {error && (
        <div className="p-1.5 mb-3 bg-red-100 text-red-900 border border-red-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Task Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            className="px-2.5 py-1.5 border-inset bg-white text-black text-sm font-pixel outline-hidden"
            placeholder="e.g. Implement user login flow"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={2}
            className="px-2.5 py-1.5 border-inset bg-white text-black text-sm font-pixel outline-hidden resize-none"
            placeholder="Describe what needs to be learned..."
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Priority Level</label>
          <select
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value, 10))}
            disabled={loading}
            className="px-2.5 py-1.5 border-inset bg-white text-black text-sm font-pixel outline-hidden"
          >
            <option value={1}>🔥 High Priority</option>
            <option value={2}>⚡ Medium Priority</option>
            <option value={3}>💤 Low Priority</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full py-2 bg-[#c0c0c0] font-bold text-sm border-outset active:border-inset cursor-pointer select-none text-center"
        >
          {loading ? 'Adding...' : 'Add Task to Database'}
        </button>
      </form>
    </div>
  );
}

