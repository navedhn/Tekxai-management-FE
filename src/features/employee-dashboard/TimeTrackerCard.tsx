import React from 'react';
import { Play, Clock, Coffee, Square } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatTrackerTime, type TrackerState } from './useTimeTracker';

type TimeTrackerCardProps = {
  trackerState: TrackerState;
  seconds: number;
  onCheckIn: () => void;
  onBreak: () => void;
  onResume: () => void;
  onCheckOut: () => void;
};

const TimeTrackerCard: React.FC<TimeTrackerCardProps> = ({
  trackerState,
  seconds,
  onCheckIn,
  onBreak,
  onResume,
  onCheckOut,
}) => (
  <Card className="bg-white border-none shadow-sm py-5 px-8">
    {trackerState === 'idle' && (
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Time Tracker</h2>
          <p className="text-xs text-gray-400 font-bold">Start tracking your time</p>
        </div>
        <Button variant="primary" className="rounded-xl px-10 h-11 flex items-center gap-2" onClick={onCheckIn}>
          <Play size={18} className="fill-white" />
          <span>Check In</span>
        </Button>
      </div>
    )}

    {trackerState === 'paused' && (
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Time Tracker Paused</h2>
          <p className="text-xs text-gray-400 font-bold">Start tracking your time</p>
        </div>
        <Button variant="primary" className="rounded-xl px-10 h-11 flex items-center gap-2" onClick={onResume}>
          <Play size={18} className="fill-white" />
          <span>Resume</span>
        </Button>
      </div>
    )}

    {trackerState === 'tracking' && (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 bg-[#F8F9FA] border border-gray-100 rounded-2xl px-6 py-2">
            <div className="flex flex-col">
              <span className="text-2xl font-black text-gray-900 leading-none tracking-tight">
                {formatTrackerTime(seconds)}
              </span>
              <span className="text-[11px] text-gray-400 font-bold mt-0.5">Today&apos;s Time</span>
            </div>
            <div className="h-8 w-8 ml-4 rounded-full bg-white flex items-center justify-center border border-gray-100 text-gray-400">
              <Clock size={16} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl px-6 h-11 flex items-center gap-2 bg-[#FFA94D]/10 hover:bg-[#FFA94D]/20 text-[#E8590C] border-none font-bold"
            onClick={onBreak}
          >
            <Coffee size={18} />
            <span>Break</span>
          </Button>
          <Button
            variant="outline"
            className="rounded-xl px-6 h-11 flex items-center gap-2 bg-[#FF6B6B]/10 hover:bg-[#FF6B6B]/20 text-[#C92A2A] border-none font-bold"
            onClick={onCheckOut}
          >
            <Square size={16} strokeWidth={3} className="fill-current" />
            <span>Check Out</span>
          </Button>
        </div>
      </div>
    )}
  </Card>
);

export default TimeTrackerCard;
