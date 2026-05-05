export type UserRole = 'Admin' | 'User';

// ===== Users =====

export interface UserSystemResponse {
  id?: string;
  Id?: string;
  name?: string;
  userName?: string;
  username?: string;
  Username?: string;
  email?: string;
  Email?: string;
  roleId?: string;
  RoleId?: string;
  roleName?: string;
  RoleName?: string;
  phoneNumber?: string;
  PhoneNumber?: string;
  nationalId?: string;
  NationalId?: string;
  shiftStartTime?: string | null;
  ShiftStartTime?: string | null;
  shiftEndTime?: string | null;
  ShiftEndTime?: string | null;
}


export interface UserDto {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  phoneNumber?: string;
  nationalId?: string;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
}

export interface UserUpdateDto {
  id: string;
  userName: string;
  email: string;
  roleId: string;
  password?: string | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
}

export interface UserCreateDto {
  name: string;
  email: string;
  userName: string;
  password: string;
  phoneNumber: string;
  nationalId: string;
  roleId: string;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
}

// ===== Roles =====

export interface RoleSystemResponse {
  roleId?: string;
  RoleId?: string;
  roleName?: string;
  RoleName?: string;
}

export interface RoleDto {
  id: string;
  name: string;
}

export interface Pagination<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  data: T[];
}

export interface UserByRoleResponse {
  userId: string;
  name: string;
  username: string;
  email: string;
  phoneNumber: string;
  nationalId: string;
  roleId: string;
  roleNameEn: string;
  roleNameAr: string;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
}

export interface GetUsersByRoleIdResponse {
  roleId: string;
  roleNameEn: string;
  roleNameAr: string;
  users: Pagination<UserByRoleResponse>;
}

export const RoleIds = {
  admin: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  entranceCashier: '11111111-1111-1111-1111-111111111111',
  exitCashier: '22222222-2222-2222-2222-222222222222',
  supervisor: '3f47ac10-b58c-4372-a567-0e02b2c3d480',
} as const;

export function isCashierRole(roleId: string | null | undefined): boolean {
  const normalized = String(roleId ?? '').trim().toLowerCase();
  return (
    normalized === RoleIds.entranceCashier ||
    normalized === RoleIds.exitCashier
  );
}
