export interface ReportTicketAttachment {
  imagePath: string;
}

export interface ReportTicketsResponse {
  ticketId: string;
  enterDate: string;
  exitDate: string;
  vehicleNumber: string | null;
  isSubscribed: boolean;
  price: number;
  collectorName: string;
  ticketNumber: string;
  attachments?: ReportTicketAttachment[];
}
