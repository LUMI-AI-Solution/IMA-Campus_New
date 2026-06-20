import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

export default function CustomSelect({ options, value, onChange, placeholder = 'Select...', className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <input type="hidden" name="staffId" value={value || ''} />
            <div 
                className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 text-xs flex justify-between items-center cursor-pointer hover:border-slate-500 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex-1 overflow-hidden whitespace-nowrap text-left pr-2 flex items-center gap-2">
                    {selectedOption ? selectedOption.label : <span className="text-slate-500">{placeholder}</span>}
                </div>
                <FaChevronDown className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={10} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] mt-1 w-full bg-[#121a24] border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    {options.map((opt, idx) => (
                        <div 
                            key={idx}
                            className={`p-2 px-3 text-xs flex items-center gap-2 cursor-pointer transition-colors ${String(opt.value) === String(value) ? 'bg-emerald-900/30 text-emerald-400' : 'text-slate-300 hover:bg-[#1a2430]'}`}
                            onClick={() => {
                                onChange({ target: { value: opt.value, name: 'staffId' } }); // Mock event to match standard onChange handler
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div className="p-2 px-3 text-xs text-slate-500 italic">No options available</div>
                    )}
                </div>
            )}
        </div>
    );
}
