/**
 * @file DTO Class Coverage Tests
 * @description Ensures DTO class definitions are loaded for coverage metrics.
 * DTOs are declarative class schemas (decorators + properties) with no logic.
 */

import {
  CancelTicketsDto,
  CheckInDto,
  CheckInResponseDto,
  ConfirmTicketsDto,
  ConfirmTicketsResponseDto,
  HolderInfoDto,
  ReserveTicketsDto,
  ReserveTicketsResponseDto,
  TransferTicketDto,
  TransferTicketResponseDto,
  TicketDto,
  PaginatedTicketListDto,
  TicketDetailDto,
  CheckInStatsDto,
  TicketTypeStatsDto,
} from '@modules/tickets/application/dtos';

describe('Application DTOs', () => {
  it('should instantiate CancelTicketsDto', () => {
    const dto = new CancelTicketsDto();
    dto.ticketIds = ['uuid-1'];
    dto.reason = 'test';
    expect(dto.ticketIds).toHaveLength(1);
  });

  it('should instantiate CheckInDto', () => {
    const dto = new CheckInDto();
    dto.qrCode = 'v1-test';
    dto.deviceId = 'scanner-001';
    dto.locationGate = 'Gate A';
    expect(dto.qrCode).toBe('v1-test');
  });

  it('should instantiate CheckInResponseDto', () => {
    const dto = new CheckInResponseDto();
    dto.isValid = true;
    dto.ticketId = 'uuid';
    dto.holderName = 'John';
    dto.ticketTypeName = 'VIP';
    dto.checkedInAt = new Date();
    dto.failureReason = null;
    expect(dto.isValid).toBe(true);
  });

  it('should instantiate ConfirmTicketsDto', () => {
    const dto = new ConfirmTicketsDto();
    dto.ticketIds = ['uuid-1'];
    dto.orderId = 'order-1';
    expect(dto.orderId).toBe('order-1');
  });

  it('should instantiate ConfirmTicketsResponseDto', () => {
    const dto = new ConfirmTicketsResponseDto();
    dto.confirmedIds = ['uuid-1'];
    expect(dto.confirmedIds).toHaveLength(1);
  });

  it('should instantiate HolderInfoDto', () => {
    const dto = new HolderInfoDto();
    dto.name = 'John';
    dto.email = 'john@test.com';
    dto.phone = '+216';
    expect(dto.name).toBe('John');
  });

  it('should instantiate ReserveTicketsDto', () => {
    const dto = new ReserveTicketsDto();
    dto.eventId = 'uuid-1';
    dto.ticketTypeId = 'uuid-2';
    dto.holders = [];
    expect(dto.eventId).toBe('uuid-1');
  });

  it('should instantiate ReserveTicketsResponseDto', () => {
    const dto = new ReserveTicketsResponseDto();
    dto.ticketIds = ['uuid-1'];
    dto.reservedUntil = new Date();
    expect(dto.ticketIds).toHaveLength(1);
  });

  it('should instantiate TransferTicketDto', () => {
    const dto = new TransferTicketDto();
    dto.newOwnerEmail = 'jane@test.com';
    expect(dto.newOwnerEmail).toBe('jane@test.com');
  });

  it('should instantiate TransferTicketResponseDto', () => {
    const dto = new TransferTicketResponseDto();
    dto.newQrCode = 'v1-new-qr';
    expect(dto.newQrCode).toBe('v1-new-qr');
  });

  it('should instantiate TicketDto', () => {
    const dto = new TicketDto();
    dto.id = 'uuid-1';
    dto.eventId = 'uuid-2';
    dto.status = 'CONFIRMED' as any;
    expect(dto.id).toBe('uuid-1');
  });

  it('should instantiate PaginatedTicketListDto', () => {
    const dto = new PaginatedTicketListDto();
    dto.data = [];
    dto.total = 0;
    dto.page = 1;
    dto.limit = 20;
    dto.totalPages = 0;
    dto.hasNextPage = false;
    dto.hasPreviousPage = false;
    expect(dto.total).toBe(0);
  });

  it('should instantiate TicketDetailDto', () => {
    const dto = new TicketDetailDto();
    dto.id = 'uuid-1';
    dto.holderName = 'John';
    dto.transferCount = 0;
    expect(dto.id).toBe('uuid-1');
  });

  it('should instantiate CheckInStatsDto', () => {
    const dto = new CheckInStatsDto();
    dto.totalTickets = 100;
    dto.checkedIn = 75;
    dto.checkInRate = 75;
    dto.byType = [];
    expect(dto.checkInRate).toBe(75);
  });

  it('should instantiate TicketTypeStatsDto', () => {
    const dto = new TicketTypeStatsDto();
    dto.ticketTypeName = 'VIP';
    dto.total = 50;
    dto.checkedIn = 30;
    dto.rate = 60;
    expect(dto.rate).toBe(60);
  });
});
