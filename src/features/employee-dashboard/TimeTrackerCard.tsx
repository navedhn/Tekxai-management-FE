import React from 'react';
import { Clock, MonitorSmartphone } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatTrackerTime, type TrackerState } from './useTimeTracker';

type TimeTrackerCardProps = {
  trackerState: TrackerState;
  seconds: number;
};

// Attendance policy: Check In / Check Out is exclusively started from the
// TekXAI Desktop Monitoring Agent — this card is read-only. It never renders
// an action button and never calls a check-in/check-out API from the web UI.
const TimeTrackerCard: React.FC<TimeTrackerCardProps> = ({ trackerState, seconds }) => (
  <Card className="bg-white border-none shadow-sm py-5 px-8">
    {trackerState === 'tracking' ? (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Time Tracker</h2>
          <p className="text-xs text-gray-400 font-bold">Checked in via TekXAI Desktop App</p>
        </div>
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
    ) : (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 flex items-center justify-center text-primary-500">
            <MonitorSmartphone size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Time Tracker</h2>
            <p className="text-xs text-gray-500 font-bold">
              Attendance can only be started from the TekXAI Desktop App.
            </p>
          </div>
        </div>
        {seconds > 0 && (
          <div className="flex items-center gap-4 bg-[#F8F9FA] border border-gray-100 rounded-2xl px-6 py-2">
            <div className="flex flex-col">
              <span className="text-2xl font-black text-gray-900 leading-none tracking-tight">
                {formatTrackerTime(seconds)}
              </span>
              <span className="text-[11px] text-gray-400 font-bold mt-0.5">Today&apos;s Time</span>
            </div>
          </div>
        )}
      </div>
    )}
  </Card>
);

export default TimeTrackerCard;
