export interface SanctionDto {
  id: string;
  name: string;
  description: string;
  amount: number;
}

export interface SanctionAddDto {
  name: string;
  description: string;
  amount: number;
}

export interface SanctionUpdateDto {
  id: string;
  name: string;
  description: string;
  amount: number;
}
