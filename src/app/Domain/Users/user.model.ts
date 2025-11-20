export type UserRole = 'Admin' | 'User';

// ===== Users =====

export interface UserSystemResponse {
  id: string;
  userName?: string;
  username?: string;
  email: string;
  roleId: string;
  roleName: string;
}

export interface UserDto {
  id: string;
  userName: string;
  email: string;
  roleId: string;
  roleName: string;
}

export interface UserUpdateDto {
  id: string;
  userName: string;
  email: string;
  roleId: string;
}

export interface UserCreateDto {
  name: string;
  email: string;
  userName: string;
  password: string;
  phoneNumber: string;
  nationalId: string;
  roleId: string;
}

// ===== Roles =====

export interface RoleSystemResponse {
  roleId: string;
  roleName: string;
}

export interface RoleDto {
  id: string;
  name: string;
}
