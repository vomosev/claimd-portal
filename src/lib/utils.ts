import { Award } from '@/services/api';
import { clsx, type ClassValue } from 'clsx';
import moment from 'moment';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isWithinTimeWindow = (award: Award) => {
  const now = moment();

  // Helper function to create moment from date and time
  interface CreateMoment {
    (
      dateStr: string | undefined,
      timeStr: string | undefined
    ): moment.Moment | null;
  }

  const createMoment: CreateMoment = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;

    // Extract just the date part from ISO string (YYYY-MM-DD)
    const datePart = moment(dateStr).format('YYYY-MM-DD');

    // Combine date and time
    return moment(`${datePart} ${timeStr}`, 'YYYY-MM-DD HH:mm:ss');
  };

  // Create start and finish moments
  const startMoment = createMoment(
    award.start_from_date,
    award.start_from_time
  );
  const finishMoment = createMoment(award.finish_date, award.finish_time);

  // If no time constraints are set, allow claiming anytime
  if (!startMoment && !finishMoment) {
    return true;
  }

  // Check start time constraint
  if (startMoment && now.isBefore(startMoment)) {
    return false; // Too early
  }

  // Check finish time constraint
  if (finishMoment && now.isAfter(finishMoment)) {
    return false; // Too late
  }

  return true;
};

export const isBeforeTimeWindow = (award: Award) => {
  const now = moment();

  // Helper function to create moment from date and time
  interface CreateMoment {
    (
      dateStr: string | undefined,
      timeStr: string | undefined
    ): moment.Moment | null;
  }

  const createMoment: CreateMoment = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;

    // Extract just the date part from ISO string (YYYY-MM-DD)
    const datePart = moment(dateStr).format('YYYY-MM-DD');

    // Combine date and time
    return moment(`${datePart} ${timeStr}`, 'YYYY-MM-DD HH:mm:ss');
  };

  const finishMoment = createMoment(award.finish_date, award.finish_time);

  // If no time constraints are set, allow claiming anytime
  if (!finishMoment) {
    return true;
  }

  // Check finish time constraint
  if (finishMoment && now.isAfter(finishMoment)) {
    return false; // Too late
  }

  return true;
};