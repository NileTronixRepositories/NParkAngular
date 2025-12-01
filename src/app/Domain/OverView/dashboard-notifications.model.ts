export interface TicketAddedNotification {
  ticketId: number;
  gateId: string;
  gateNumber: number;
  enterDate: string;  
  hour: number;      
}

export interface TicketExitedNotification {
  ticketId: number;
  gateId: string;
  gateNumber: number;
  exitDate: string;  
  hour: number;      
  price: number;     
}

export interface TicketCollectedNotification {
  ticketId: number;
  collectedAmount: number;
  collectorName: string;
}