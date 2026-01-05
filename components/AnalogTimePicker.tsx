
import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check } from 'lucide-react';

interface AnalogTimePickerProps {
  value: string; // "HH:mm" 24h format
  onChange: (value: string) => void;
  label: string;
}

const AnalogTimePicker: React.FC<AnalogTimePickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'hours' | 'minutes'>('hours');
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('AM');
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setMeridiem(h >= 12 ? 'PM' : 'AM');
      setSelectedHour(h % 12 === 0 ? 12 : h % 12);
      setSelectedMinute(m);
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleConfirm = () => {
    let h = selectedHour;
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    const formatted = `${h.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const formatDisplay = () => {
    const h = selectedHour.toString().padStart(2, '0');
    const m = selectedMinute.toString().padStart(2, '0');
    return `${h}:${m} ${meridiem}`;
  };

  const renderClockFace = () => {
    const items = view === 'hours' ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const radius = 90; // px
    const selectedValue = view === 'hours' ? selectedHour : selectedMinute;

    return (
      <div className="relative w-56 h-56 bg-gray-100 rounded-full mx-auto mt-4 border border-gray-200 shadow-inner">
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full z-10" />
        
        {/* Hand */}
        {(() => {
          const index = items.indexOf(selectedValue);
          const angle = (index * 30) - 90;
          return (
            <div 
              className="absolute top-1/2 left-1/2 origin-left bg-blue-500 h-0.5 transition-all duration-300 pointer-events-none"
              style={{ width: `${radius - 10}px`, transform: `rotate(${angle}deg)` }}
            >
              <div className="absolute right-0 -top-3 w-7 h-7 bg-blue-600 rounded-full border-2 border-white shadow-md" />
            </div>
          );
        })()}

        {items.map((num, i) => {
          const angle = (i * 30) - 90;
          const x = Math.cos(angle * (Math.PI / 180)) * radius;
          const y = Math.sin(angle * (Math.PI / 180)) * radius;
          const isActive = num === selectedValue;

          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (view === 'hours') {
                  setSelectedHour(num);
                  setView('minutes');
                } else {
                  setSelectedMinute(num);
                }
              }}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-xs font-bold transition-colors hover:bg-blue-100 flex items-center justify-center ${isActive ? 'text-white z-20' : 'text-gray-600'}`}
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              {num}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-400 transition-colors shadow-sm text-sm"
      >
        <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {value ? formatDisplay() : 'Select Time'}
        </span>
        <Clock className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <div className="flex gap-1">
              <button 
                type="button"
                onClick={() => setView('hours')}
                className={`px-3 py-1 rounded-lg text-sm font-bold ${view === 'hours' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {selectedHour}
              </button>
              <span className="text-gray-300 font-bold self-center">:</span>
              <button 
                type="button"
                onClick={() => setView('minutes')}
                className={`px-3 py-1 rounded-lg text-sm font-bold ${view === 'minutes' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {selectedMinute.toString().padStart(2, '0')}
              </button>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button 
                type="button"
                onClick={() => setMeridiem('AM')}
                className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${meridiem === 'AM' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}
              >
                AM
              </button>
              <button 
                type="button"
                onClick={() => setMeridiem('PM')}
                className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${meridiem === 'PM' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}
              >
                PM
              </button>
            </div>
          </div>

          {renderClockFace()}

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" /> Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalogTimePicker;
