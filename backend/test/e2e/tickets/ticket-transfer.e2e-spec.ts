/**
 * @file Ticket Transfer E2E Tests
 * @description Transfer flow with new QR code generation, max transfer limit
 */


import { CancelTicketsHandler } from '@modules/tickets/application/commands/cancel-tickets/cancel-tickets.handler';
import { CheckInTicketHandler } from '@modules/tickets/application/commands/check-in-ticket/check-in-ticket.handler';
import { ConfirmTicketsHandler } from '@modules/tickets/application/commands/confirm-tickets/confirm-tickets.handler';
import { ExpireTicketsHandler } from '@modules/tickets/application/commands/expire-tickets/expire-tickets.handler';
import { ReserveTicketsHandler } from '@modules/tickets/application/commands/reserve-tickets/reserve-tickets.handler';
import { TransferTicketHandler } from '@modules/tickets/application/commands/transfer-ticket/transfer-ticket.handler';
import { CHECK_IN_REPOSITORY } from '@modules/tickets/application/ports/check-in.repository.port';
import { EVENT_QUERY_PORT } from '@modules/tickets/application/ports/event-query.port';
import { TICKET_REPOSITORY } from '@modules/tickets/application/ports/ticket.repository.port';
import { USER_QUERY_PORT } from '@modules/tickets/application/ports/user-query.port';
import { GetEventCheckInStatsHandler } from '@modules/tickets/application/queries/get-event-check-in-stats/get-event-check-in-stats.handler';
import { GetEventTicketsHandler } from '@modules/tickets/application/queries/get-event-tickets/get-event-tickets.handler';
import { GetTicketByIdHandler } from '@modules/tickets/application/queries/get-ticket-by-id/get-ticket-by-id.handler';
import { GetTicketByQRCodeHandler } from '@modules/tickets/application/queries/get-ticket-by-qr-code/get-ticket-by-qr-code.handler';
import { GetUserTicketsHandler } from '@modules/tickets/application/queries/get-user-tickets/get-user-tickets.handler';
import { TicketStatus } from '@modules/tickets/domain/value-objects/ticket-status.vo';
import { TicketsController } from '@modules/tickets/infrastructure/controllers/tickets.controller';
import { TicketS3StorageService } from '@modules/tickets/infrastructure/services/ticket-s3-storage.service';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '@shared/infrastructure/common/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/infrastructure/common/guards/roles.guard';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';
import request from 'supertest';

import {
  InMemoryTicketRepository,
  InMemoryCheckInRepository,
  MockEventQueryAdapter,
  MockUserQueryAdapter,
  MockDomainEventPublisher,
  MockTicketS3StorageService,
  TEST_USER_IDS,
  generateTestToken,
} from './helpers/test-setup';

describe('Ticket Transfer E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let ticketRepository: InMemoryTicketRepository;
  let userQueryAdapter: MockUserQueryAdapter;
  let participantToken: string;
  let otherUserToken: string;

  beforeAll(async () => {
    ticketRepository = new InMemoryTicketRepository();
    const checkInRepository = new InMemoryCheckInRepository();
    const eventQueryAdapter = new MockEventQueryAdapter();
    userQueryAdapter = new MockUserQueryAdapter();
    const eventPublisher = new MockDomainEventPublisher();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [TicketsController],
      providers: [
        { provide: TICKET_REPOSITORY, useValue: ticketRepository },
        { provide: CHECK_IN_REPOSITORY, useValue: checkInRepository },
        { provide: EVENT_QUERY_PORT, useValue: eventQueryAdapter },
        { provide: USER_QUERY_PORT, useValue: userQueryAdapter },
        { provide: DomainEventPublisher, useValue: eventPublisher },
        { provide: TicketS3StorageService, useValue: new MockTicketS3StorageService() },
        JwtAuthGuard,
        RolesGuard,
        ReserveTicketsHandler,
        ConfirmTicketsHandler,
        CancelTicketsHandler,
        CheckInTicketHandler,
        TransferTicketHandler,
        ExpireTicketsHandler,
        GetTicketByIdHandler,
        GetTicketByQRCodeHandler,
        GetUserTicketsHandler,
        GetEventTicketsHandler,
        GetEventCheckInStatsHandler,
      ],
    }).compile();

    app = module.createNestApplication();

    const jwtSvc = module.get<JwtService>(JwtService);
    app.use((req: any, _res: any, next: any) => {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const payload = jwtSvc.verify(authHeader.substring(7));
          req.user = { userId: payload.sub, email: payload.email, role: payload.role };
        } catch { /* leave req.user undefined */ }
      }
      next();
    });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    jwtService = module.get(JwtService);
    participantToken = generateTestToken(jwtService, {
      userId: TEST_USER_IDS.participant,
      email: 'john@example.com',
      role: 'PARTICIPANT',
    });
    otherUserToken = generateTestToken(jwtService, {
      userId: TEST_USER_IDS.otherUser,
      email: 'other@example.com',
      role: 'PARTICIPANT',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    ticketRepository.clear();
    userQueryAdapter.clear();
  });

  // ============================================
  // POST /api/tickets/:id/transfer
  // ============================================

  describe('POST /api/tickets/:id/transfer', () => {
    it('should transfer ticket and return new QR code', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
        userId: TEST_USER_IDS.participant,
      });
      const originalQr = ticket.qrCode.value;

      const response = await request(app.getHttpServer())
        .post(`/api/tickets/${ticket.id}/transfer`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ newOwnerEmail: 'other@example.com' })
        .expect(HttpStatus.OK);

      expect(response.body.newQrCode).toBeDefined();
      expect(response.body.newQrCode).not.toBe(originalQr);
      expect(response.body.newQrCode).toMatch(/^v1-/);
    });

    it('should update ticket ownership after transfer', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
        userId: TEST_USER_IDS.participant,
      });

      await request(app.getHttpServer())
        .post(`/api/tickets/${ticket.id}/transfer`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ newOwnerEmail: 'other@example.com' })
        .expect(HttpStatus.OK);

      const updatedTicket = await ticketRepository.findById(ticket.id);
      expect(updatedTicket!.userId).toBe(TEST_USER_IDS.otherUser);
    });

    it('should reject transfer by non-owner', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
        userId: TEST_USER_IDS.participant,
      });

      await request(app.getHttpServer())
        .post(`/api/tickets/${ticket.id}/transfer`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ newOwnerEmail: 'john@example.com' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject transfer when max transfers reached', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
        userId: TEST_USER_IDS.participant,
        transferCount: 3,
      });

      await request(app.getHttpServer())
        .post(`/api/tickets/${ticket.id}/transfer`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ newOwnerEmail: 'other@example.com' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject transfer when target user not found', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
        userId: TEST_USER_IDS.participant,
      });

      await request(app.getHttpServer())
        .post(`/api/tickets/${ticket.id}/transfer`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ newOwnerEmail: 'nobody@nowhere.com' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject transfer of non-existent ticket', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets/99999999-0000-4000-8000-000000000099/transfer')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ newOwnerEmail: 'other@example.com' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ============================================
  // PDF Download
  // ============================================

  describe('GET /api/tickets/:id/pdf', () => {
    it('should redirect to signed S3 URL', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
        userId: TEST_USER_IDS.participant,
        pdfUrl: 'tickets/dev/test-ticket.pdf',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/tickets/${ticket.id}/pdf`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(HttpStatus.FOUND);

      expect(response.headers.location).toContain('s3.example.com');
      expect(response.headers.location).toContain('signed=true');
    });

    it('should fail for ticket without PDF', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.RESERVED,
        userId: TEST_USER_IDS.participant,
        pdfUrl: null,
      });

      await request(app.getHttpServer())
        .get(`/api/tickets/${ticket.id}/pdf`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject PDF download by non-owner', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
        userId: TEST_USER_IDS.participant,
        pdfUrl: 'tickets/dev/test-ticket.pdf',
      });

      await request(app.getHttpServer())
        .get(`/api/tickets/${ticket.id}/pdf`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
