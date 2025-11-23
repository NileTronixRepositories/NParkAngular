export enum GateType {
  Entrance = 1,
  Exit = 2,
}

export interface LoginRequest {
  userName: string;
  password: string;
  gateType: GateType;
  gateNumber: number;
}

export interface LoginFirstTimeRequest {
  userName: string;
  password: string;
  newPassword: string;
  gateType: GateType;
  gateNumber: number;
}

export interface LoginResponse {
  token: string;
  roleName: string;
}

export interface GateDevicePeripheral {
  pcIp: string;
  lprIp: string;
  hasPc: boolean;
  hasLpr: boolean;
}

export interface LoginResponse {
  token: string;
  roleName: string;
  permissions?: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
}
export interface GateDto {
  id: number;
  gateNumber: number;
  gateType: GateType;
  name?: string;
}

export interface AuthResponse {
  token: string;
  roleName: string;
  permissions: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
}
