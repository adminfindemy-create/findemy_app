import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

// M3.1: Missed Classes — sessions the student was enrolled for but never checked into
// (the explicit `present: false` write), with whatever reason/recording link the academy
// attached. No reschedule action anywhere on this data — by design.
export const useMissedClasses = () =>
  useQuery({
    queryKey: ['me', 'missed-sessions'],
    queryFn: () => api.me.getMissedSessions(),
  });
