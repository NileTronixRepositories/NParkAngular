export interface ReportTicketAttachment {
  imagePath?: string;
  filePath?: string;
  path?: string;
}

export interface ReportTicketsResponse {
  ticketId: string;
  enterDate: string;
  exitDate: string | null;
  vehicleNumber: string | null;
  isSubscribed: boolean;
  price: number;
  collectorName: string;
  ticketNumber: string;
  exceedPrice: number;
  isInsideParking: boolean;
  ticketStatus: string;
  createdByUserId: string;
  createdByUserName: string;
  entryGateNumber: number | null;
  exitGateNumber: number | null;
  attachments: ReportTicketAttachment[];
}
