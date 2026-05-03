export enum DurationType {
  Days = 1,
  Hours = 2,
  Year = 3,
}

export interface PricingSchemaAddDto {
  name: string;
  durationType: DurationType;
  startTime: string | null;
  endTime: string | null;
  price: number;
  isRepeated: boolean;
  totalDays: number | null;
  totalHours: number | null;
}

export interface PricingSchemaUpdateDto extends PricingSchemaAddDto {
  id: string;
  isEnterPriceSchema?: false;
}

export interface EnterPricingSchemaUpdateDto {
  id: string;
  name: string;
  price: number;
  isEnterPriceSchema: true;
}

export type PricingSchemaUpdateRequest = PricingSchemaUpdateDto | EnterPricingSchemaUpdateDto;

export interface PricingSchemaRow {
  id: string;
  name: string;
  durationType: DurationType;
  startTime: string | null;
  endTime: string | null;
  price: number;
  isRepeated: boolean;
  totalDays: number | null;
  totalHours: number | null;
  isEnterPriceSchema: boolean;
}

export interface CreateEnterPricingSchemaRequest {
  name: string;
  salary: number;
}

export interface CreateEnterPricingSchemaResponse {
  id: string;
  name: string;
  salary: number;
  isEnterPriceSchema: boolean;
}
