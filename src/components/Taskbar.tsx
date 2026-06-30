import { useState, useEffect } from 'react';

interface TaskbarProps {
  username: string | null;
  onLogout: () => void;
}

export default function Taskbar({ username, onLogout }: TaskbarProps) {
  const [time, setTime] = useState<string>('');
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const minStr = minutes < 10 ? '0' + minutes : minutes;
      setTime(`${hours}:${minStr} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="taskbar"
      className="fixed bottom-0 left-0 right-0 h-10 bg-[#c0c0c0] border-t-2 border-white flex items-center justify-between px-1.5 select-none z-50 font-pixel text-xs"
    >
      {/* Start Button & Left Area */}
      <div className="flex items-center gap-1.5 relative">
        <button
          onClick={() => setStartOpen(!startOpen)}
          className={`h-7 px-2 flex items-center gap-1.5 bg-[#c0c0c0] font-bold cursor-pointer select-none ${
            startOpen ? 'border-inset' : 'border-outset'
          }`}
        >
          {/* Start Logo */}
          <div className="w-4 h-4 bg-[#008080] flex items-center justify-center text-[9px] text-white font-bold">
            TB
          </div>
          <span className="tracking-wide">Start</span>
        </button>

        <div className="w-[1px] h-6 bg-[#808080] mx-1 border-r border-white"></div>

        {/* Active Application tab indicator */}
        <div className="h-7 px-3 bg-[#d4d0c8] border-inset flex items-center text-xs font-bold gap-2 max-w-44 truncate">
          <span>📁</span>
          <span>Task Manager</span>
        </div>

        {username && (
          <div className="hidden sm:flex h-7 px-3 border border-[#808080] flex items-center text-xs opacity-60">
            {username}.exe
          </div>
        )}
      </div>

      {/* Start Menu Dropdown */}
      {startOpen && (
        <div className="absolute bottom-10 left-1 w-52 bg-[#c0c0c0] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#000000] border-b-[#000000] p-1 shadow-lg z-50 flex">
          {/* Sidebar banner */}
          <div className="w-6 bg-[#000080] flex items-end p-1 select-none">
            <span className="text-white font-bold text-xs transform -rotate-90 origin-bottom-left whitespace-nowrap translate-y-[-4px] tracking-widest uppercase">
              TaskBuddy95
            </span>
          </div>

          {/* Menu items */}
          <div className="flex-1 flex flex-col gap-0.5 pl-1.5 py-1">
            <div className="px-2 py-1.5 hover:bg-[#000080] hover:text-white flex items-center gap-2 cursor-pointer text-xs">
              <span>📚</span>
              <span>User Guide</span>
            </div>
            <div className="px-2 py-1.5 hover:bg-[#000080] hover:text-white flex items-center gap-2 cursor-pointer text-xs">
              <span>⚙️</span>
              <span>Control Panel</span>
            </div>
            <div className="px-2 py-1.5 hover:bg-[#000080] hover:text-white flex items-center gap-2 cursor-pointer text-xs">
              <span>🧠</span>
              <span>Gemini Core</span>
            </div>
            <hr className="border-t border-[#808080] border-b border-white my-1" />
            {username ? (
              <>
                <div className="px-2 py-1 text-[10px] text-gray-700 italic select-none">
                  Logged in as: {username}
                </div>
                <div
                  onClick={() => {
                    onLogout();
                    setStartOpen(false);
                  }}
                  className="px-2 py-1.5 hover:bg-[#000080] hover:text-white flex items-center gap-2 cursor-pointer text-xs text-red-800 hover:text-white"
                >
                  <span>🚪</span>
                  <span>Log Out...</span>
                </div>
              </>
            ) : (
              <div className="px-2 py-1.5 text-[10px] text-gray-600 select-none">
                Please login to begin
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clock on bottom-right */}
      <div className="flex items-center gap-2 px-3 h-7 border-inset bg-[#c0c0c0] text-black font-bold">
        {/* Network connections & icons */}
        <span className="text-[10px] flex items-center gap-1 select-none mr-1.5">
          <span>🔊</span>
          <span>🔌</span>
        </span>
        <span className="tracking-wider select-none">{time}</span>
      </div>
    </div>
  );
}

