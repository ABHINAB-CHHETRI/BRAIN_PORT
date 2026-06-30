import React from 'react';

interface RetroWindowProps {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export default function RetroWindow({ title, onClose, children, className = '', id }: RetroWindowProps) {
  return (
    <div
      id={id}
      className={`p-[3px] bg-[#c0c0c0] shadow-lg select-none border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#000000] border-b-[#000000] ${className}`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between bg-[#000080] p-1 select-none">
        <span className="text-white font-bold text-sm tracking-wider font-pixel flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-[#c0c0c0] border-inset flex items-center justify-center">
            <div className="w-2 h-2 bg-[#000080]"></div>
          </div>
          <span>{title}</span>
        </span>
        <div className="flex items-center gap-1">
          <button className="w-4 h-4 bg-[#c0c0c0] border-outset text-black text-[10px] flex items-center justify-center font-bold font-pixel active:border-inset cursor-pointer">
            _
          </button>
          <button className="w-4 h-4 bg-[#c0c0c0] border-outset text-black text-[10px] flex items-center justify-center font-bold font-pixel active:border-inset cursor-pointer">
            □
          </button>
          {onClose ? (
            <button
              onClick={onClose}
              className="w-4 h-4 bg-[#c0c0c0] border-outset text-black text-[10px] flex items-center justify-center font-bold font-pixel active:border-inset cursor-pointer hover:bg-red-200"
            >
              X
            </button>
          ) : (
            <button className="w-4 h-4 bg-[#c0c0c0] border-outset text-black text-[10px] flex items-center justify-center font-bold font-pixel active:border-inset cursor-pointer">
              X
            </button>
          )}
        </div>
      </div>

      {/* Content window */}
      <div className="p-1.5 text-black font-pixel">
        {children}
      </div>
    </div>
  );
}

