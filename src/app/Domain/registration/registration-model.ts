export type DurationType = 'Hours' | 'Days' | 'Monthly';

export interface PlateGroup {
  p1: string;
  p2: string;
  p3: string;
  p4: string;
}

export interface DocumentItem {
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  isImage: boolean;
  file?: File | null;
  remoteId?: string;
}

export interface PricingSchemaDto {
  id: string;
  name: string;
  description?: string | null;
  salary?: number | null;
}

export interface EnterPriceSchemaSelectionDto {
  id: string;
  name: string;
  salary: number;
}

export interface AddParkingMembershipCommandFront {
  Name: string;
  Phone: string;
  NationalId: string;
  VehicleNumber: string;
  CardNumber: string;
  PricingSchemeId: string;
  VehicleImage?: File[];
}
export interface VehicleImageDto {
  id?: string;
  filePath?: string;
  imagePath?: string;
  path?: string;
  url?: string;
  fileUrl?: string;
  fileName?: string;
  name?: string;
  contentType?: string;
  mimeType?: string;
}
export interface ParkingMembershipDto {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  vehicleImage?: VehicleImageDto[];
  vehicleImages?: VehicleImageDto[];
  attachments?: VehicleImageDto[];
  vehicleNumber: string;
  cardNumber: string;
  pricingSchemeId: string;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  endDate: string;
}

export interface PagedResult<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  data: T[];
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
