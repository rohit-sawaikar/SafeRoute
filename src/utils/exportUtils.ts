/**
 * SafeRoute Admin Data Export Utility
 * Generates native Microsoft Excel (.xlsx) files using SheetJS (xlsx library).
 * Supports Registered Users, Login Activity, and Combined Multi-Sheet Reports with Date Range Filters.
 */

import * as XLSX from 'xlsx';
import { RegisteredUserDoc, LoginActivityDoc } from '../services/firebaseClient';

export type DateFilterOption = 'ALL' | 'LAST_15_DAYS' | 'LAST_7_DAYS';

/**
 * Filter items by timestamp based on selected DateFilterOption
 */
export function filterByDateRange<T extends { createdAt?: number; loginTimestamp?: number; timestamp?: number }>(
  items: T[],
  filter: DateFilterOption
): T[] {
  if (filter === 'ALL') return items;

  const now = Date.now();
  const daysInMs = filter === 'LAST_7_DAYS' ? 7 * 24 * 60 * 60 * 1000 : 15 * 24 * 60 * 60 * 1000;
  const cutoffTime = now - daysInMs;

  return items.filter((item) => {
    const itemTime = item.createdAt ?? item.loginTimestamp ?? item.timestamp ?? 0;
    return itemTime >= cutoffTime;
  });
}

/**
 * Helper to format timestamp into human-readable date & time string for Excel
 */
export function formatExcelDateTime(timestamp?: number): string {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Download an XLSX workbook as a file in the browser
 */
function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format provider/auth method into readable label
 */
function formatAuthMethod(providerId?: string): string {
  if (!providerId) return 'Email/Password';
  const p = providerId.toLowerCase();
  if (p.includes('google')) return 'Google OAuth';
  if (p.includes('phone')) return 'Phone SMS OTP';
  return 'Email & Password';
}

/**
 * Export Registered Users to Excel (.xlsx) file
 */
export function exportRegisteredUsersToExcel(users: RegisteredUserDoc[], filter: DateFilterOption = 'ALL') {
  const filteredUsers = filterByDateRange(users, filter);

  const data = filteredUsers.map((user, idx) => ({
    '#': idx + 1,
    'User ID (UID)': user.uid,
    'Display Name': user.displayName || 'SafeRoute User',
    'Email Address': user.email || 'N/A',
    'Phone Number': user.phone || 'N/A',
    'Authentication Method': formatAuthMethod(user.providerId || (user as any).authProvider),
    'Registration Date & Time': formatExcelDateTime(user.createdAt),
    'Last Login Date & Time': formatExcelDateTime(user.lastLoginAt),
    'Account Role': user.role || 'USER',
    'Account Status': user.status || 'ACTIVE',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths
  const colWidths = [
    { wch: 4 },  // #
    { wch: 32 }, // UID
    { wch: 24 }, // Display Name
    { wch: 28 }, // Email
    { wch: 18 }, // Phone
    { wch: 22 }, // Auth Method
    { wch: 24 }, // Registration Date
    { wch: 24 }, // Last Login Date
    { wch: 14 }, // Role
    { wch: 14 }, // Status
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registered Users');

  const dateSuffix = new Date().toISOString().slice(0, 10);
  const filterLabel = filter.toLowerCase().replace(/_/g, '-');
  downloadWorkbook(workbook, `SafeRoute_Registered_Users_${filterLabel}_${dateSuffix}.xlsx`);
}

/**
 * Export Login Activity Logs to Excel (.xlsx) file
 */
export function exportLoginActivityToExcel(logs: LoginActivityDoc[], filter: DateFilterOption = 'ALL') {
  const filteredLogs = filterByDateRange(logs, filter);

  const data = filteredLogs.map((log, idx) => ({
    '#': idx + 1,
    'Log ID': log.id,
    'User ID (UID)': log.uid,
    'Display Name': log.displayName || 'SafeRoute User',
    'Email Address': log.email || 'N/A',
    'Phone Number': log.phone || 'N/A',
    'Authentication Method': formatAuthMethod(log.providerId),
    'Login Timestamp': formatExcelDateTime(log.loginTimestamp || (log as any).timestamp),
    'Login Status': log.status || 'SUCCESS',
    'Device / Environment': log.userAgent || (log as any).ipAddress || 'Web Client (Browser)',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  const colWidths = [
    { wch: 4 },  // #
    { wch: 28 }, // Log ID
    { wch: 32 }, // UID
    { wch: 24 }, // Display Name
    { wch: 28 }, // Email
    { wch: 18 }, // Phone
    { wch: 22 }, // Auth Method
    { wch: 24 }, // Timestamp
    { wch: 14 }, // Status
    { wch: 45 }, // User Agent / Device
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Login Activity');

  const dateSuffix = new Date().toISOString().slice(0, 10);
  const filterLabel = filter.toLowerCase().replace(/_/g, '-');
  downloadWorkbook(workbook, `SafeRoute_Login_Activity_${filterLabel}_${dateSuffix}.xlsx`);
}

/**
 * Export Combined Multi-Sheet Report (Registered Users + Login Activity + Summary) to Excel (.xlsx)
 */
export function exportAllDataToExcel(
  users: RegisteredUserDoc[],
  logs: LoginActivityDoc[],
  filter: DateFilterOption = 'ALL'
) {
  const filteredUsers = filterByDateRange(users, filter);
  const filteredLogs = filterByDateRange(logs, filter);

  const workbook = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryData = [
    { 'Metric / Field': 'Report Title', 'Value': 'SafeRoute Admin Comprehensive User & Activity Report' },
    { 'Metric / Field': 'Export Generated At', 'Value': formatExcelDateTime(Date.now()) },
    { 'Metric / Field': 'Date Range Filter Applied', 'Value': filter.replace(/_/g, ' ') },
    { 'Metric / Field': 'Total Registered Users (Filtered)', 'Value': filteredUsers.length },
    { 'Metric / Field': 'Total Login Events (Filtered)', 'Value': filteredLogs.length },
    { 'Metric / Field': 'Active Accounts Count', 'Value': filteredUsers.filter((u) => u.status === 'ACTIVE').length },
    { 'Metric / Field': 'Suspended Accounts Count', 'Value': filteredUsers.filter((u) => u.status === 'SUSPENDED').length },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 32 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  // 2. Registered Users Sheet
  const usersData = filteredUsers.map((user, idx) => ({
    '#': idx + 1,
    'User ID (UID)': user.uid,
    'Display Name': user.displayName || 'SafeRoute User',
    'Email Address': user.email || 'N/A',
    'Phone Number': user.phone || 'N/A',
    'Authentication Method': formatAuthMethod(user.providerId || (user as any).authProvider),
    'Registration Date & Time': formatExcelDateTime(user.createdAt),
    'Last Login Date & Time': formatExcelDateTime(user.lastLoginAt),
    'Account Role': user.role || 'USER',
    'Account Status': user.status || 'ACTIVE',
  }));
  const usersSheet = XLSX.utils.json_to_sheet(usersData);
  usersSheet['!cols'] = [
    { wch: 4 }, { wch: 32 }, { wch: 24 }, { wch: 28 }, { wch: 18 },
    { wch: 22 }, { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, usersSheet, 'Registered Users');

  // 3. Login Activity Sheet
  const logsData = filteredLogs.map((log, idx) => ({
    '#': idx + 1,
    'Log ID': log.id,
    'User ID (UID)': log.uid,
    'Display Name': log.displayName || 'SafeRoute User',
    'Email Address': log.email || 'N/A',
    'Phone Number': log.phone || 'N/A',
    'Authentication Method': formatAuthMethod(log.providerId),
    'Login Timestamp': formatExcelDateTime(log.loginTimestamp || (log as any).timestamp),
    'Login Status': log.status || 'SUCCESS',
    'Device / Environment': log.userAgent || (log as any).ipAddress || 'Web Client (Browser)',
  }));
  const logsSheet = XLSX.utils.json_to_sheet(logsData);
  logsSheet['!cols'] = [
    { wch: 4 }, { wch: 28 }, { wch: 32 }, { wch: 24 }, { wch: 28 },
    { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 14 }, { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(workbook, logsSheet, 'Login Activity');

  const dateSuffix = new Date().toISOString().slice(0, 10);
  const filterLabel = filter.toLowerCase().replace(/_/g, '-');
  downloadWorkbook(workbook, `SafeRoute_Admin_Full_Report_${filterLabel}_${dateSuffix}.xlsx`);
}
