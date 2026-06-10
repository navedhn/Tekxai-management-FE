import { Message } from './chatTypes';

export const getDateLabel = (timestamp: string): string => {
  if (timestamp.includes('Today')) return 'Today';
  if (timestamp.includes('Yesterday')) return 'Yesterday';
  const part = timestamp.split(' at ')[0];
  return part || timestamp;
};

export const shouldShowDateDivider = (prev: Message | undefined, curr: Message): boolean => {
  if (!prev) return true;
  return getDateLabel(prev.timestamp) !== getDateLabel(curr.timestamp);
};

export const truncatePreview = (text: string, max = 36) =>
  text.length <= max ? text : `${text.slice(0, max)}…`;
