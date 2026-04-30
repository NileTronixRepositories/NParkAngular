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
export interface LoginFirstTimeCommand {
  userName: string;
  password: string;
  newPassword: string;
  confirmedPassword: string;
}
export interface LoginResponse {
  token: string;
  roleName: string;
  gateDevicePeripheral?: GateDevicePeripheral | null;
}

export interface GateDevicePeripheral {
  pcIp: string;
  lprIp: string;
  hasScanner?: boolean | null;
  hasPc: boolean;
  hasLpr: boolean;
  gateNumber: number;
  gateType: GateType;
}

export interface LoginResponse {
  token: string;
  roleName: string;
  permissions?: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
}
export interface GateDto {
  gateId: string; // Guid as string
  gateName: string;
  gateType: GateType;
}
export interface AuthResponse {
  token: string;
  roleName: string;
  permissions: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
}
