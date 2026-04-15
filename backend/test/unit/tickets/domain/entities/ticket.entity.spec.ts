/**
 * @file Ticket Entity Unit Tests
 * @description Tests for Ticket aggregate root - the main entity of the Tickets bounded context
 */

import {
  TicketEntity,
  QRCodeVO,
  TicketStatus,
  CheckInResultVO,
  TicketReservedEvent,
  TicketConfirmedEvent,
  TicketCancelledEvent,
  TicketCheckedInEvent,
  TicketTransferredEvent,
  TicketExpiredEvent,
  DuplicateCheckInAttemptedEvent,
} from '@modules/tickets/domain';
import { Money } from '@shared/domain/value-objects/money.vo';

describe('TicketEntity (Aggregate Root)', () => {
  // ============================================
  // Helper Functions
  // ============================================

  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const validEventId = '550e8400-e29b-41d4-a716-446655440001';
  const validTicketTypeId = '550e8400-e29b-41d4-a716-446655440002';
  const validUserId = '550e8400-e29b-41d4-a716-446655440003';
  const validStaffId = '550e8400-e29b-41d4-a716-446655440004';
  const validOrderId = '550e8400-e29b-41d4-a716-446655440005';
  const validNewOwnerId = '550e8400-e29b-41d4-a716-446655440006';

  const createValidReservationProps = (
    overrides: Record<string, unknown> = {},
  ) => ({
    eventId: validEventId,
    ticketTypeId: validTicketTypeId,
    userId: validUserId,
    qrCode: QRCodeVO.generate(),
    price: Money.create(50, 'TND'),
    holderName: 'John Doe',
    holderEmail: 'john@example.com',
    holderPhone: '+216 50 000 000',
    reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
    ...overrides,
  });

  const createReservedTicket = (): TicketEntity => {
    const result = TicketEntity.createReservation(createValidReservationProps());
    expect(result.isSuccess).toBe(true);
    return result.value;
  };

  const createConfirmedTicket = (): TicketEntity => {
    const ticket = createReservedTicket();
    ticket.confirm(validOrderId);
    return ticket;
  };

  const createCheckedInTicket = (): TicketEntity => {
    const ticket = createConfirmedTicket();
    ticket.checkIn(validStaffId, 'Gate A', 'John Doe', 'Standard');
    return ticket;
  };

  const createReconstitutedTicket = (
    overrides: Record<string, unknown> = {},
  ): TicketEntity => {
    return TicketEntity.reconstitute({
      id: validUUID,
      eventId: validEventId,
      ticketTypeId: validTicketTypeId,
      orderId: null,
      userId: validUserId,
      qrCode: QRCodeVO.generate(),
      status: TicketStatus.RESERVED,
      priceAmount: 50,
      priceCurrency: 'TND',
      holderName: 'John Doe',
      holderEmail: 'john@example.com',
      holderPhone: null,
      checkedInAt: null,
      checkedInBy: null,
      transferredTo: null,
      transferredAt: null,
      transferCount: 0,
      reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
      pdfUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  // ============================================
  // createReservation()
  // ============================================

  describe('createReservation()', () => {
    describe('Success Cases', () => {
      it('should create a valid reserved ticket with all properties', () => {
        const props = createValidReservationProps();
        const result = TicketEntity.createReservation(props);

        expect(result.isSuccess).toBe(true);
        const ticket = result.value;
        expect(ticket.eventId).toBe(validEventId);
        expect(ticket.ticketTypeId).toBe(validTicketTypeId);
        expect(ticket.userId).toBe(validUserId);
        expect(ticket.status).toBe(TicketStatus.RESERVED);
        expect(ticket.holderName).toBe('John Doe');
        expect(ticket.holderEmail).toBe('john@example.com');
        expect(ticket.priceAmount).toBe(50);
        expect(ticket.priceCurrency).toBe('TND');
      });

      it('should set RESERVED status', () => {
        const ticket = createReservedTicket();
        expect(ticket.status).toBe(TicketStatus.RESERVED);
        expect(ticket.isReserved()).toBe(true);
      });

      it('should have null orderId initially', () => {
        const ticket = createReservedTicket();
        expect(ticket.orderId).toBeNull();
      });

      it('should have null pdfUrl initially', () => {
        const ticket = createReservedTicket();
        expect(ticket.pdfUrl).toBeNull();
      });

      it('should have zero transfer count', () => {
        const ticket = createReservedTicket();
        expect(ticket.transferCount).toBe(0);
      });

      it('should generate unique IDs', () => {
        const ticket1 = createReservedTicket();
        const ticket2 = createReservedTicket();
        expect(ticket1.id).not.toBe(ticket2.id);
      });

      it('should emit TicketReservedEvent', () => {
        const ticket = createReservedTicket();
        const events = ticket.domainEvents;

        const reservedEvent = events.find(
          (e): e is TicketReservedEvent => e instanceof TicketReservedEvent,
        );
        expect(reservedEvent).toBeDefined();
        expect(reservedEvent!.ticketId).toBe(ticket.id);
        expect(reservedEvent!.eventId).toBe(validEventId);
        expect(reservedEvent!.userId).toBe(validUserId);
      });

      it('should set timestamps', () => {
        const before = new Date();
        const ticket = createReservedTicket();
        const after = new Date();

        expect(ticket.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(ticket.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should trim holder name', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ holderName: '  John Doe  ' }),
        );
        expect(result.value.holderName).toBe('John Doe');
      });

      it('should create with optional phone as null', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ holderPhone: undefined }),
        );
        expect(result.isSuccess).toBe(true);
        expect(result.value.holderPhone).toBeNull();
      });
    });

    describe('Validation Failures', () => {
      it('should fail with invalid eventId (not UUID)', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ eventId: 'invalid' }),
        );
        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('eventId');
      });

      it('should fail with empty eventId', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ eventId: '' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail with invalid ticketTypeId', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ ticketTypeId: 'bad' }),
        );
        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('ticketTypeId');
      });

      it('should fail with invalid userId', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ userId: '12345' }),
        );
        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('userId');
      });

      it('should fail with empty holderName', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ holderName: '' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail with whitespace-only holderName', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ holderName: '   ' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail with holderName exceeding 200 chars', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ holderName: 'A'.repeat(201) }),
        );
        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('200');
      });

      it('should accept holderName at exactly 200 chars', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ holderName: 'A'.repeat(200) }),
        );
        expect(result.isSuccess).toBe(true);
      });

      it('should fail with empty holderEmail', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ holderEmail: '' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail with negative price', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ price: Money.create(-1, 'TND') }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should accept zero price (free tickets)', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ price: Money.create(0, 'TND') }),
        );
        expect(result.isSuccess).toBe(true);
        expect(result.value.priceAmount).toBe(0);
      });

      it('should fail with missing reservedUntil', () => {
        const result = TicketEntity.createReservation(
          createValidReservationProps({ reservedUntil: null }),
        );
        expect(result.isFailure).toBe(true);
      });
    });
  });

  // ============================================
  // confirm()
  // ============================================

  describe('confirm()', () => {
    it('should confirm a RESERVED ticket', () => {
      const ticket = createReservedTicket();
      const result = ticket.confirm(validOrderId);

      expect(result.isSuccess).toBe(true);
      expect(ticket.status).toBe(TicketStatus.CONFIRMED);
      expect(ticket.isConfirmed()).toBe(true);
      expect(ticket.orderId).toBe(validOrderId);
    });

    it('should clear reservedUntil on confirmation', () => {
      const ticket = createReservedTicket();
      expect(ticket.reservedUntil).not.toBeNull();

      ticket.confirm(validOrderId);
      expect(ticket.reservedUntil).toBeNull();
    });

    it('should emit TicketConfirmedEvent', () => {
      const ticket = createReservedTicket();
      ticket.confirm(validOrderId);

      const events = ticket.domainEvents;
      const confirmed = events.find(
        (e): e is TicketConfirmedEvent => e instanceof TicketConfirmedEvent,
      );
      expect(confirmed).toBeDefined();
      expect(confirmed!.orderId).toBe(validOrderId);
    });

    it('should fail when ticket is CONFIRMED', () => {
      const ticket = createConfirmedTicket();
      const result = ticket.confirm(validOrderId);

      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is CANCELLED', () => {
      const ticket = createReservedTicket();
      ticket.cancel('Test reason');
      const result = ticket.confirm(validOrderId);

      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is CHECKED_IN', () => {
      const ticket = createCheckedInTicket();
      const result = ticket.confirm(validOrderId);

      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is EXPIRED', () => {
      const ticket = createReservedTicket();
      ticket.expire();
      const result = ticket.confirm(validOrderId);

      expect(result.isFailure).toBe(true);
    });
  });

  // ============================================
  // cancel()
  // ============================================

  describe('cancel()', () => {
    it('should cancel a RESERVED ticket', () => {
      const ticket = createReservedTicket();
      const result = ticket.cancel('Changed my mind');

      expect(result.isSuccess).toBe(true);
      expect(ticket.status).toBe(TicketStatus.CANCELLED);
      expect(ticket.isCancelled()).toBe(true);
    });

    it('should cancel a CONFIRMED ticket', () => {
      const ticket = createConfirmedTicket();
      const result = ticket.cancel('Want refund');

      expect(result.isSuccess).toBe(true);
      expect(ticket.status).toBe(TicketStatus.CANCELLED);
    });

    it('should emit TicketCancelledEvent with wasConfirmed=false for RESERVED', () => {
      const ticket = createReservedTicket();
      ticket.cancel('Test');

      const events = ticket.domainEvents;
      const cancelled = events.find(
        (e): e is TicketCancelledEvent => e instanceof TicketCancelledEvent,
      );
      expect(cancelled).toBeDefined();
      expect(cancelled!.wasConfirmed).toBe(false);
      expect(cancelled!.reason).toBe('Test');
    });

    it('should emit TicketCancelledEvent with wasConfirmed=true for CONFIRMED', () => {
      const ticket = createConfirmedTicket();
      ticket.cancel('Refund');

      const events = ticket.domainEvents;
      const cancelled = events.find(
        (e): e is TicketCancelledEvent => e instanceof TicketCancelledEvent,
      );
      expect(cancelled).toBeDefined();
      expect(cancelled!.wasConfirmed).toBe(true);
    });

    it('should fail when already CANCELLED', () => {
      const ticket = createReservedTicket();
      ticket.cancel('First');

      const result = ticket.cancel('Second');
      expect(result.isFailure).toBe(true);
    });

    it('should fail when CHECKED_IN', () => {
      const ticket = createCheckedInTicket();
      const result = ticket.cancel('Nope');

      expect(result.isFailure).toBe(true);
    });

    it('should fail when EXPIRED', () => {
      const ticket = createReservedTicket();
      ticket.expire();

      const result = ticket.cancel('Too late');
      expect(result.isFailure).toBe(true);
    });

    it('should use default reason when empty', () => {
      const ticket = createReservedTicket();
      ticket.cancel('');

      const events = ticket.domainEvents;
      const cancelled = events.find(
        (e): e is TicketCancelledEvent => e instanceof TicketCancelledEvent,
      );
      expect(cancelled!.reason).toBe('No reason provided');
    });
  });

  // ============================================
  // checkIn()
  // ============================================

  describe('checkIn()', () => {
    it('should check in a CONFIRMED ticket', () => {
      const ticket = createConfirmedTicket();
      const result = ticket.checkIn(validStaffId, 'Gate A', 'John', 'Standard');

      expect(result.isSuccess).toBe(true);
      expect(ticket.status).toBe(TicketStatus.CHECKED_IN);
      expect(ticket.isCheckedIn()).toBe(true);
      expect(ticket.checkedInBy).toBe(validStaffId);
      expect(ticket.checkedInAt).toBeInstanceOf(Date);
    });

    it('should return CheckInResultVO on success', () => {
      const ticket = createConfirmedTicket();
      const result = ticket.checkIn(validStaffId, 'Gate B', 'John Doe', 'VIP');

      expect(result.value).toBeInstanceOf(CheckInResultVO);
      expect(result.value.isValid).toBe(true);
      expect(result.value.holderName).toBe('John Doe');
      expect(result.value.ticketTypeName).toBe('VIP');
      expect(result.value.checkedInAt).toBeInstanceOf(Date);
    });

    it('should emit TicketCheckedInEvent', () => {
      const ticket = createConfirmedTicket();
      ticket.checkIn(validStaffId, 'Gate C', 'John', 'Standard');

      const events = ticket.domainEvents;
      const checkedIn = events.find(
        (e): e is TicketCheckedInEvent => e instanceof TicketCheckedInEvent,
      );
      expect(checkedIn).toBeDefined();
      expect(checkedIn!.staffId).toBe(validStaffId);
      expect(checkedIn!.locationGate).toBe('Gate C');
    });

    it('should fail and emit DuplicateCheckInAttemptedEvent on duplicate check-in', () => {
      const ticket = createCheckedInTicket();

      const result = ticket.checkIn(validStaffId, 'Gate A', 'John', 'Standard');
      expect(result.isFailure).toBe(true);

      const events = ticket.domainEvents;
      const duplicate = events.find(
        (e): e is DuplicateCheckInAttemptedEvent =>
          e instanceof DuplicateCheckInAttemptedEvent,
      );
      expect(duplicate).toBeDefined();
      expect(duplicate!.ticketId).toBe(ticket.id);
    });

    it('should fail when ticket is RESERVED', () => {
      const ticket = createReservedTicket();
      const result = ticket.checkIn(validStaffId, 'Gate A', 'John', 'Standard');

      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is CANCELLED', () => {
      const ticket = createReservedTicket();
      ticket.cancel('Test');

      const result = ticket.checkIn(validStaffId, 'Gate A', 'John', 'Standard');
      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is EXPIRED', () => {
      const ticket = createReservedTicket();
      ticket.expire();

      const result = ticket.checkIn(validStaffId, 'Gate A', 'John', 'Standard');
      expect(result.isFailure).toBe(true);
    });
  });

  // ============================================
  // transfer()
  // ============================================

  describe('transfer()', () => {
    it('should transfer a CONFIRMED ticket to a new owner', () => {
      const ticket = createConfirmedTicket();
      const originalQr = ticket.qrCode.value;

      const result = ticket.transfer(validNewOwnerId, 'new@example.com');

      expect(result.isSuccess).toBe(true);
      expect(ticket.userId).toBe(validNewOwnerId);
      expect(ticket.holderEmail).toBe('new@example.com');
      expect(ticket.qrCode.value).not.toBe(originalQr);
      expect(ticket.transferCount).toBe(1);
    });

    it('should return new QRCodeVO', () => {
      const ticket = createConfirmedTicket();
      const result = ticket.transfer(validNewOwnerId, 'new@example.com');

      expect(result.value).toBeInstanceOf(QRCodeVO);
      expect(result.value.value).toMatch(/^v1-/);
    });

    it('should invalidate PDF URL on transfer', () => {
      const ticket = createConfirmedTicket();
      ticket.setPdfUrl('tickets/test/some-id.pdf');
      expect(ticket.pdfUrl).not.toBeNull();

      ticket.transfer(validNewOwnerId, 'new@example.com');
      expect(ticket.pdfUrl).toBeNull();
    });

    it('should emit TicketTransferredEvent', () => {
      const ticket = createConfirmedTicket();
      ticket.transfer(validNewOwnerId, 'new@example.com');

      const events = ticket.domainEvents;
      const transferred = events.find(
        (e): e is TicketTransferredEvent => e instanceof TicketTransferredEvent,
      );
      expect(transferred).toBeDefined();
      expect(transferred!.fromUserId).toBe(validUserId);
      expect(transferred!.toUserId).toBe(validNewOwnerId);
      expect(transferred!.transferCount).toBe(1);
    });

    it('should increment transfer count on each transfer', () => {
      const ticket = createConfirmedTicket();

      ticket.transfer(validNewOwnerId, 'a@example.com');
      expect(ticket.transferCount).toBe(1);

      ticket.transfer('550e8400-e29b-41d4-a716-446655440007', 'b@example.com');
      expect(ticket.transferCount).toBe(2);

      ticket.transfer('550e8400-e29b-41d4-a716-446655440008', 'c@example.com');
      expect(ticket.transferCount).toBe(3);
    });

    it('should fail after 3 transfers (max transfers reached)', () => {
      const ticket = createConfirmedTicket();

      ticket.transfer(validNewOwnerId, 'a@example.com');
      ticket.transfer('550e8400-e29b-41d4-a716-446655440007', 'b@example.com');
      ticket.transfer('550e8400-e29b-41d4-a716-446655440008', 'c@example.com');

      const result = ticket.transfer(
        '550e8400-e29b-41d4-a716-446655440009',
        'd@example.com',
      );
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('3');
    });

    it('should fail when ticket is RESERVED', () => {
      const ticket = createReservedTicket();
      const result = ticket.transfer(validNewOwnerId, 'new@example.com');

      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is CHECKED_IN', () => {
      const ticket = createCheckedInTicket();
      const result = ticket.transfer(validNewOwnerId, 'new@example.com');

      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is CANCELLED', () => {
      const ticket = createReservedTicket();
      ticket.cancel('Test');

      const result = ticket.transfer(validNewOwnerId, 'new@example.com');
      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is EXPIRED', () => {
      const ticket = createReservedTicket();
      ticket.expire();

      const result = ticket.transfer(validNewOwnerId, 'new@example.com');
      expect(result.isFailure).toBe(true);
    });
  });

  // ============================================
  // expire()
  // ============================================

  describe('expire()', () => {
    it('should expire a RESERVED ticket', () => {
      const ticket = createReservedTicket();
      const result = ticket.expire();

      expect(result.isSuccess).toBe(true);
      expect(ticket.status).toBe(TicketStatus.EXPIRED);
    });

    it('should emit TicketExpiredEvent', () => {
      const ticket = createReservedTicket();
      ticket.expire();

      const events = ticket.domainEvents;
      const expired = events.find(
        (e): e is TicketExpiredEvent => e instanceof TicketExpiredEvent,
      );
      expect(expired).toBeDefined();
      expect(expired!.ticketId).toBe(ticket.id);
    });

    it('should fail when ticket is CONFIRMED', () => {
      const ticket = createConfirmedTicket();
      const result = ticket.expire();

      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is CHECKED_IN', () => {
      const ticket = createCheckedInTicket();
      const result = ticket.expire();

      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is CANCELLED', () => {
      const ticket = createReservedTicket();
      ticket.cancel('Test');

      const result = ticket.expire();
      expect(result.isFailure).toBe(true);
    });

    it('should fail when ticket is already EXPIRED', () => {
      const ticket = createReservedTicket();
      ticket.expire();

      const result = ticket.expire();
      expect(result.isFailure).toBe(true);
    });
  });

  // ============================================
  // Query Methods
  // ============================================

  describe('Query Methods', () => {
    it('canBeCheckedIn() should return true only for CONFIRMED', () => {
      expect(createReservedTicket().canBeCheckedIn()).toBe(false);
      expect(createConfirmedTicket().canBeCheckedIn()).toBe(true);
      expect(createCheckedInTicket().canBeCheckedIn()).toBe(false);
    });

    it('canBeTransferred() should return true only for CONFIRMED with transfer count < 3', () => {
      const ticket = createConfirmedTicket();
      expect(ticket.canBeTransferred()).toBe(true);

      // Transfer 3 times
      ticket.transfer(validNewOwnerId, 'a@example.com');
      ticket.transfer('550e8400-e29b-41d4-a716-446655440007', 'b@example.com');
      ticket.transfer('550e8400-e29b-41d4-a716-446655440008', 'c@example.com');
      expect(ticket.canBeTransferred()).toBe(false);
    });

    it('isExpired() should detect naturally expired reservations', () => {
      const ticket = createReconstitutedTicket({
        reservedUntil: new Date(Date.now() - 1000), // Past date
      });
      expect(ticket.isExpired()).toBe(true);
    });

    it('isExpired() should return false for active reservations', () => {
      const ticket = createReservedTicket();
      expect(ticket.isExpired()).toBe(false);
    });
  });

  // ============================================
  // setPdfUrl()
  // ============================================

  describe('setPdfUrl()', () => {
    it('should set the PDF URL', () => {
      const ticket = createConfirmedTicket();
      ticket.setPdfUrl('tickets/dev/abc.pdf');

      expect(ticket.pdfUrl).toBe('tickets/dev/abc.pdf');
    });

    it('should update updatedAt timestamp', () => {
      const ticket = createConfirmedTicket();
      const before = ticket.updatedAt;

      // Small delay to ensure time difference
      ticket.setPdfUrl('tickets/dev/abc.pdf');
      expect(ticket.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  // ============================================
  // reconstitute()
  // ============================================

  describe('reconstitute()', () => {
    it('should reconstitute without emitting events', () => {
      const ticket = createReconstitutedTicket();
      expect(ticket.domainEvents).toHaveLength(0);
    });

    it('should preserve all properties', () => {
      const ticket = createReconstitutedTicket({
        status: TicketStatus.CONFIRMED,
        orderId: validOrderId,
        transferCount: 2,
      });

      expect(ticket.status).toBe(TicketStatus.CONFIRMED);
      expect(ticket.orderId).toBe(validOrderId);
      expect(ticket.transferCount).toBe(2);
    });
  });

  // ============================================
  // Domain Events - pullDomainEvents()
  // ============================================

  describe('Domain Events', () => {
    it('pullDomainEvents() should return and clear events', () => {
      const ticket = createReservedTicket();
      expect(ticket.domainEvents.length).toBeGreaterThanOrEqual(1);

      const pulled = ticket.pullDomainEvents();
      expect(pulled.length).toBeGreaterThanOrEqual(1);
      expect(ticket.domainEvents).toHaveLength(0);
    });

    it('should accumulate events through lifecycle', () => {
      const ticket = createReservedTicket();
      ticket.confirm(validOrderId);
      ticket.checkIn(validStaffId, 'Gate A', 'John', 'Standard');

      const events = ticket.domainEvents;
      expect(events.length).toBe(3); // Reserved + Confirmed + CheckedIn
    });
  });
});
