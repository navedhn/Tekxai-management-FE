import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

// Using native Date helpers instead of date-fns to avoid missing dependency errors
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

interface DatePickerProps {
    value?: string | Date;
    onChange: (date: string) => void;
    label?: string;
    placeholder?: string;
    error?: string;
    className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    label,
    placeholder = 'Select date',
    error,
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const selectedDate = value ? new Date(value) : null;
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateSelect = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${day}`);
        setIsOpen(false);
    };

    const renderHeader = () => (
        <div className="flex items-center justify-between px-2 py-4">
            <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            >
                <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h2>
            <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Adjust start day to Monday (0: Sun, 1: Mon...)
        let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const calendarDays = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            calendarDays.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            calendarDays.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month padding
        const totalSlots = 42;
        const nextMonthPadding = totalSlots - calendarDays.length;
        for (let i = 1; i <= nextMonthPadding; i++) {
            calendarDays.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return (
            <div className="grid grid-cols-7 gap-1 p-2">
                {DAYS.map(day => (
                    <div key={day} className="h-10 flex items-center justify-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
                {calendarDays.map((d, index) => {
                    const isSelected = selectedDate &&
                        d.date.getDate() === selectedDate.getDate() &&
                        d.date.getMonth() === selectedDate.getMonth() &&
                        d.date.getFullYear() === selectedDate.getFullYear();

                    const isToday = new Date().toDateString() === d.date.toDateString();

                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleDateSelect(d.date)}
                            className={cn(
                                "h-11 w-11 flex items-center justify-center rounded-full text-sm font-bold transition-all relative",
                                !d.isCurrentMonth ? "text-gray-300" : "text-gray-700 hover:bg-gradient-to-b from-[#005CDA] to-[#001F4A] hover:text-white",
                                isSelected && "bg-gradient-to-br from-[#005CDA] to-[#001F4A] text-white hover:bg-primary-700 hover:text-white shadow-lg",
                                isToday && !isSelected && "text-primary-600 after:absolute after:bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-gradient-to-b from-[#005CDA] to-[#001F4A] after:rounded-full"
                            )}
                        >
                            {d.date.getDate()}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={cn("flex flex-col gap-1.5 w-full relative", className)} ref={containerRef}>
            {label && (
                <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase ml-1">
                    {label}
                </label>
            )}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm text-gray-700 hover:border-gray-300 transition-all cursor-pointer",
                    error && "border-red-500",
                    !value && "text-gray-400"
                )}
            >
                <span className="font-bold">
                    {value ? new Date(value).toLocaleDateString('en-GB') : placeholder}
                </span>
                <CalendarIcon size={18} className={cn("text-gray-400 transition-colors", isOpen && "text-primary-500")} />
            </div>

            {error && (
                <p className="text-xs text-red-500 ml-1 font-bold">{error}</p>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute top-[calc(100%+8px)] left-0 w-[340px] bg-white border border-gray-100 rounded-3xl shadow-2xl z-[99] p-2 overflow-hidden"
                    >
                        {renderHeader()}
                        {renderCalendar()}
                        <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <button
                                type="button"
                                onClick={() => handleDateSelect(new Date())}
                                className="text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-widest"
                            >
                                Selected Today
                            </button>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                © {new Date().getFullYear()} TekXAI
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DatePicker;
