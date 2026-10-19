// Calculation rules (same as the desktop app):
//   working day = Sun–Thu row in the attendance table → 8h required
//   WFH → credited 8h · Fri/Sat, approved leave (Leave page), Leave / Public Holiday → not required,
//   hours worked on those days count as extra · today is not counted unless ticked in the Days list.
export const HOURS = 8;
export const MAX_RECOVERY_MIN = 120; // balance advice: stay at most 2h beyond the 8h time
export const ATT_PATH = '/my/outsource/attendance';
export const LEAVE_PATH = '/my/leave';
export const WEEKEND = [5, 6]; // Friday, Saturday (Date.getDay)
export const EXCL_STATES = ['public_holiday', 'leave'];
export const EXCL_TEXT = /holiday|leave/i;
export const WFH_TEXT = /work\s*from\s*home|\bwfh\b/i;
export const ROOT_ID = 'lean-attendance-root';
export const CACHE_KEY = 'lean-attendance-cache-v1';
export const ALLOWED_HOST = /(^|\.)erp\.lean\.sa$/;
