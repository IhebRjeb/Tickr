/**
 * Events Controller Unit Tests
 *
 * Tests for EventsController handling HTTP requests and delegating to handlers
 */


import {
  CreateEventHandler,
  UpdateEventHandler,
  PublishEventHandler,
  CancelEventHandler,
  AddTicketTypeHandler,
  UpdateTicketTypeHandler,
  RemoveTicketTypeHandler,
  UploadEventImageHandler,
  SetEventCommissionOverrideHandler,
  AssignEventCheckInStaffHandler,
  RevokeEventCheckInStaffHandler,
  GetEventByIdHandler,
  GetPublishedEventsHandler,
  SearchEventsHandler,
  GetEventsByCategoryHandler,
  GetUpcomingEventsHandler,
  GetOrganizerEventsHandler,
  GetEventCheckInStaffHandler,
  GetMyEventCheckInAccessHandler,
  CreateEventDto,
  UpdateEventDto,
  AddTicketTypeDto,
  UpdateTicketTypeDto,
  EventFilterDto,
  CancelEventDto,
} from '@modules/events/application';
import { EVENT_REPOSITORY } from '@modules/events/application/ports/event.repository.port';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { EventsController } from '@modules/events/infrastructure/controllers/events.controller';
import { IsEventOwnerGuard } from '@modules/events/infrastructure/guards/is-event-owner.guard';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Result } from '@shared/domain/result';

// ============================================
// Mock Handlers
// ============================================

const createMockHandler = () => ({
  execute: jest.fn(),
});

const createMockRepository = () => ({
  findById: jest.fn(),
  findByOrganizerId: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('EventsController', () => {
  let controller: EventsController;
  let createEventHandler: ReturnType<typeof createMockHandler>;
  let updateEventHandler: ReturnType<typeof createMockHandler>;
  let publishEventHandler: ReturnType<typeof createMockHandler>;
  let cancelEventHandler: ReturnType<typeof createMockHandler>;
  let addTicketTypeHandler: ReturnType<typeof createMockHandler>;
  let updateTicketTypeHandler: ReturnType<typeof createMockHandler>;
  let removeTicketTypeHandler: ReturnType<typeof createMockHandler>;
  let uploadEventImageHandler: ReturnType<typeof createMockHandler>;
  let setEventCommissionOverrideHandler: ReturnType<typeof createMockHandler>;
  let assignEventCheckInStaffHandler: ReturnType<typeof createMockHandler>;
  let revokeEventCheckInStaffHandler: ReturnType<typeof createMockHandler>;
  let getEventByIdHandler: ReturnType<typeof createMockHandler>;
  let getPublishedEventsHandler: ReturnType<typeof createMockHandler>;
  let searchEventsHandler: ReturnType<typeof createMockHandler>;
  let getEventsByCategoryHandler: ReturnType<typeof createMockHandler>;
  let getUpcomingEventsHandler: ReturnType<typeof createMockHandler>;
  let getOrganizerEventsHandler: ReturnType<typeof createMockHandler>;
  let getEventCheckInStaffHandler: ReturnType<typeof createMockHandler>;
  let getMyEventCheckInAccessHandler: ReturnType<typeof createMockHandler>;
  let mockEventRepository: ReturnType<typeof createMockRepository>;

  const mockUser = {
    userId: 'user-123',
    email: 'organizer@example.com',
    role: 'ORGANIZER',
  };

  const mockEventDto = {
    id: 'event-123',
    title: 'Test Event',
    description: 'A test event',
    category: EventCategory.CONCERT,
    status: EventStatus.DRAFT,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-02'),
    location: {
      city: 'Tunis',
      country: 'Tunisia',
    },
  };

  const mockPaginatedResult = {
    data: [mockEventDto],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    createEventHandler = createMockHandler();
    updateEventHandler = createMockHandler();
    publishEventHandler = createMockHandler();
    cancelEventHandler = createMockHandler();
    addTicketTypeHandler = createMockHandler();
    updateTicketTypeHandler = createMockHandler();
    removeTicketTypeHandler = createMockHandler();
    uploadEventImageHandler = createMockHandler();
    setEventCommissionOverrideHandler = createMockHandler();
    assignEventCheckInStaffHandler = createMockHandler();
    revokeEventCheckInStaffHandler = createMockHandler();
    getEventByIdHandler = createMockHandler();
    getPublishedEventsHandler = createMockHandler();
    searchEventsHandler = createMockHandler();
    getEventsByCategoryHandler = createMockHandler();
    getUpcomingEventsHandler = createMockHandler();
    getOrganizerEventsHandler = createMockHandler();
    getEventCheckInStaffHandler = createMockHandler();
    getMyEventCheckInAccessHandler = createMockHandler();
    mockEventRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: CreateEventHandler, useValue: createEventHandler },
        { provide: UpdateEventHandler, useValue: updateEventHandler },
        { provide: PublishEventHandler, useValue: publishEventHandler },
        { provide: CancelEventHandler, useValue: cancelEventHandler },
        { provide: AddTicketTypeHandler, useValue: addTicketTypeHandler },
        { provide: UpdateTicketTypeHandler, useValue: updateTicketTypeHandler },
        { provide: RemoveTicketTypeHandler, useValue: removeTicketTypeHandler },
        { provide: UploadEventImageHandler, useValue: uploadEventImageHandler },
        {
          provide: SetEventCommissionOverrideHandler,
          useValue: setEventCommissionOverrideHandler,
        },
        {
          provide: AssignEventCheckInStaffHandler,
          useValue: assignEventCheckInStaffHandler,
        },
        {
          provide: RevokeEventCheckInStaffHandler,
          useValue: revokeEventCheckInStaffHandler,
        },
        { provide: GetEventByIdHandler, useValue: getEventByIdHandler },
        { provide: GetPublishedEventsHandler, useValue: getPublishedEventsHandler },
        { provide: SearchEventsHandler, useValue: searchEventsHandler },
        { provide: GetEventsByCategoryHandler, useValue: getEventsByCategoryHandler },
        { provide: GetUpcomingEventsHandler, useValue: getUpcomingEventsHandler },
        { provide: GetOrganizerEventsHandler, useValue: getOrganizerEventsHandler },
        {
          provide: GetEventCheckInStaffHandler,
          useValue: getEventCheckInStaffHandler,
        },
        {
          provide: GetMyEventCheckInAccessHandler,
          useValue: getMyEventCheckInAccessHandler,
        },
        { provide: EVENT_REPOSITORY, useValue: mockEventRepository },
        IsEventOwnerGuard,
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setEventCommissionOverride', () => {
    it('should configure an event commission override', async () => {
      const response = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        commissionRateOverride: 0.03,
        effectiveCommissionRate: 0.03,
        usesGlobalRate: false,
      };
      setEventCommissionOverrideHandler.execute.mockResolvedValue(
        Result.ok(response),
      );

      const result = await controller.setEventCommissionOverride(
        response.eventId,
        { ...mockUser, role: 'ADMIN' },
        { commissionRate: 0.03 },
      );

      expect(result).toEqual(response);
      expect(setEventCommissionOverrideHandler.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('check-in staff management', () => {
    it('assigns check-in staff by email', async () => {
      const assignment = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440003',
        email: 'staff@example.com',
        firstName: 'Door',
        lastName: 'Staff',
        isAccountAvailable: true,
        assignedAt: new Date(),
        revokedAt: null,
      };
      assignEventCheckInStaffHandler.execute.mockResolvedValue(
        Result.ok(assignment),
      );

      const result = await controller.assignEventCheckInStaff(
        assignment.eventId,
        mockUser,
        { email: assignment.email },
      );

      expect(result).toEqual(assignment);
    });

    it('maps duplicate assignment to conflict', async () => {
      assignEventCheckInStaffHandler.execute.mockResolvedValue(
        Result.fail({
          type: 'ALREADY_ASSIGNED',
          message: 'User is already assigned to this event',
        }),
      );

      await expect(
        controller.assignEventCheckInStaff(
          '550e8400-e29b-41d4-a716-446655440001',
          mockUser,
          { email: 'staff@example.com' },
        ),
      ).rejects.toThrow('User is already assigned to this event');
    });

    it('revokes staff by assignment ID', async () => {
      revokeEventCheckInStaffHandler.execute.mockResolvedValue(
        Result.ok(undefined),
      );

      await controller.revokeEventCheckInStaff(
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440004',
        mockUser,
      );

      expect(revokeEventCheckInStaffHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('lists the current user check-in events', async () => {
      const response = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      getMyEventCheckInAccessHandler.execute.mockResolvedValue(
        Result.ok(response),
      );

      const result = await controller.getMyEventCheckInAccess(mockUser, {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(response);
    });
  });

  describe('getPublishedEvents', () => {
    it('should return paginated events', async () => {
      getPublishedEventsHandler.execute.mockResolvedValue(Result.ok(mockPaginatedResult));

      const filters: EventFilterDto = { category: EventCategory.CONCERT, page: 1, limit: 20 };

      const result = await controller.getPublishedEvents(filters);

      expect(result).toEqual(mockPaginatedResult);
      expect(getPublishedEventsHandler.execute).toHaveBeenCalled();
    });

    it('should apply filters when provided', async () => {
      getPublishedEventsHandler.execute.mockResolvedValue(Result.ok(mockPaginatedResult));

      const filters: EventFilterDto = {
        category: EventCategory.CONCERT,
        city: 'Tunis',
        country: 'Tunisia',
        minPrice: 10,
        maxPrice: 100,
        page: 2,
        limit: 10,
      };

      await controller.getPublishedEvents(filters);

      const executedQuery = getPublishedEventsHandler.execute.mock.calls[0][0];
      expect(executedQuery.page).toBe(2);
      expect(executedQuery.limit).toBe(10);
    });
  });

  describe('searchEvents', () => {
    it('should search events by query string', async () => {
      searchEventsHandler.execute.mockResolvedValue(Result.ok(mockPaginatedResult));

      const result = await controller.searchEvents('concert', 1, 20);

      expect(result).toEqual(mockPaginatedResult);
      expect(searchEventsHandler.execute).toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty search query', async () => {
      await expect(controller.searchEvents('', 1, 20)).rejects.toThrow(BadRequestException);
      await expect(controller.searchEvents('   ', 1, 20)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEventsByCategory', () => {
    it('should return events for valid category', async () => {
      getEventsByCategoryHandler.execute.mockResolvedValue(Result.ok(mockPaginatedResult));

      const result = await controller.getEventsByCategory('concert', 1, 20);

      expect(result).toEqual(mockPaginatedResult);
    });

    it('should throw BadRequestException for invalid category', async () => {
      await expect(controller.getEventsByCategory('invalid', 1, 20)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return upcoming events', async () => {
      getUpcomingEventsHandler.execute.mockResolvedValue(Result.ok(mockPaginatedResult));

      const result = await controller.getUpcomingEvents('Tunis', 'Tunisia', 1, 20);

      expect(result).toEqual(mockPaginatedResult);
      expect(getUpcomingEventsHandler.execute).toHaveBeenCalled();
    });
  });

  describe('getEventById', () => {
    it('should return event by ID', async () => {
      getEventByIdHandler.execute.mockResolvedValue(Result.ok(mockEventDto));

      const result = await controller.getEventById('event-123', mockUser);

      expect(result).toEqual(mockEventDto);
    });

    it('should throw NotFoundException when event not found', async () => {
      getEventByIdHandler.execute.mockResolvedValue(
        Result.fail({ type: 'EVENT_NOT_FOUND', message: 'Event not found' }),
      );

      await expect(controller.getEventById('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for access denied', async () => {
      getEventByIdHandler.execute.mockResolvedValue(
        Result.fail({ type: 'ACCESS_DENIED', message: 'Access denied' }),
      );

      await expect(controller.getEventById('event-123', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createEvent', () => {
    const createDto: CreateEventDto = {
      title: 'New Event',
      description: 'A new event',
      category: EventCategory.CONCERT,
      location: {
        city: 'Tunis',
        country: 'Tunisia',
      },
      startDate: '2026-06-01T10:00:00Z',
      endDate: '2026-06-01T20:00:00Z',
    };

    it('should create event successfully', async () => {
      createEventHandler.execute.mockResolvedValue(Result.ok({ eventId: 'new-event-123' }));

      const result = await controller.createEvent(mockUser, createDto);

      expect(result.eventId).toBe('new-event-123');
      expect(result.status).toBe('DRAFT');
      expect(result.message).toBe('Event created successfully');
    });

    it('should throw NotFoundException when user not found', async () => {
      createEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      await expect(controller.createEvent(mockUser, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when not organizer', async () => {
      createEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'NOT_ORGANIZER', message: 'Not an organizer' }),
      );

      await expect(controller.createEvent(mockUser, createDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnprocessableEntityException for validation errors', async () => {
      createEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'VALIDATION_ERROR', message: 'Invalid data' }),
      );

      await expect(controller.createEvent(mockUser, createDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw UnprocessableEntityException for invalid date range', async () => {
      createEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'INVALID_DATE_RANGE', message: 'Invalid dates' }),
      );

      await expect(controller.createEvent(mockUser, createDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw InternalServerErrorException for persistence error', async () => {
      createEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'PERSISTENCE_ERROR', message: 'Database error' }),
      );

      await expect(controller.createEvent(mockUser, createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateEvent', () => {
    const updateDto: UpdateEventDto = {
      title: 'Updated Event',
    };

    it('should update event successfully', async () => {
      updateEventHandler.execute.mockResolvedValue(Result.ok({ event: {} }));
      getEventByIdHandler.execute.mockResolvedValue(Result.ok(mockEventDto));

      const result = await controller.updateEvent('event-123', mockUser, updateDto);

      expect(result).toEqual(mockEventDto);
    });

    it('should throw NotFoundException when event not found', async () => {
      updateEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'EVENT_NOT_FOUND', message: 'Event not found' }),
      );

      await expect(controller.updateEvent('event-123', mockUser, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when not owner', async () => {
      updateEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'NOT_OWNER', message: 'Not the owner' }),
      );

      await expect(controller.updateEvent('event-123', mockUser, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when no changes', async () => {
      updateEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'NO_CHANGES', message: 'No changes' }),
      );

      await expect(controller.updateEvent('event-123', mockUser, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when cannot modify', async () => {
      updateEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'CANNOT_MODIFY', message: 'Cannot modify' }),
      );

      await expect(controller.updateEvent('event-123', mockUser, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelEvent', () => {
    const cancelDto: CancelEventDto = {
      reason: 'Event cancelled due to weather',
    };

    it('should cancel event successfully', async () => {
      cancelEventHandler.execute.mockResolvedValue(Result.ok(undefined));

      const result = await controller.cancelEvent('event-123', mockUser, cancelDto);

      expect(result.message).toBe('Event cancelled successfully');
    });

    it('should throw NotFoundException when event not found', async () => {
      cancelEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'EVENT_NOT_FOUND', message: 'Event not found' }),
      );

      await expect(controller.cancelEvent('event-123', mockUser, cancelDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when not owner', async () => {
      cancelEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'NOT_OWNER', message: 'Not the owner' }),
      );

      await expect(controller.cancelEvent('event-123', mockUser, cancelDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when already cancelled', async () => {
      cancelEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'ALREADY_CANCELLED', message: 'Already cancelled' }),
      );

      await expect(controller.cancelEvent('event-123', mockUser, cancelDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnprocessableEntityException for missing reason', async () => {
      cancelEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'MISSING_REASON', message: 'Missing reason' }),
      );

      await expect(controller.cancelEvent('event-123', mockUser, cancelDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('publishEvent', () => {
    it('should publish event successfully', async () => {
      publishEventHandler.execute.mockResolvedValue(Result.ok(undefined));

      const result = await controller.publishEvent('event-123', mockUser);

      expect(result.message).toBe('Event published successfully');
    });

    it('should throw NotFoundException when event not found', async () => {
      publishEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'EVENT_NOT_FOUND', message: 'Event not found' }),
      );

      await expect(controller.publishEvent('event-123', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when not owner', async () => {
      publishEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'NOT_OWNER', message: 'Not the owner' }),
      );

      await expect(controller.publishEvent('event-123', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when wrong status', async () => {
      publishEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'WRONG_STATUS', message: 'Wrong status' }),
      );

      await expect(controller.publishEvent('event-123', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when missing ticket types', async () => {
      publishEventHandler.execute.mockResolvedValue(
        Result.fail({ type: 'MISSING_TICKET_TYPES', message: 'No ticket types' }),
      );

      await expect(controller.publishEvent('event-123', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addTicketType', () => {
    const addTicketDto: AddTicketTypeDto = {
      name: 'VIP',
      price: 100,
      currency: Currency.TND,
      quantity: 50,
      salesStartDate: '2026-05-01T00:00:00Z',
      salesEndDate: '2026-05-31T23:59:59Z',
    };

    it('should add ticket type successfully', async () => {
      addTicketTypeHandler.execute.mockResolvedValue(
        Result.ok({ ticketTypeId: 'ticket-type-123' }),
      );

      const result = await controller.addTicketType('event-123', mockUser, addTicketDto);

      expect(result.ticketTypeId).toBe('ticket-type-123');
      expect(result.message).toBe('Ticket type added successfully');
    });

    it('should throw NotFoundException when event not found', async () => {
      addTicketTypeHandler.execute.mockResolvedValue(
        Result.fail({ type: 'EVENT_NOT_FOUND', message: 'Event not found' }),
      );

      await expect(controller.addTicketType('event-123', mockUser, addTicketDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when not owner', async () => {
      addTicketTypeHandler.execute.mockResolvedValue(
        Result.fail({ type: 'NOT_OWNER', message: 'Not the owner' }),
      );

      await expect(controller.addTicketType('event-123', mockUser, addTicketDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException for max ticket types reached', async () => {
      addTicketTypeHandler.execute.mockResolvedValue(
        Result.fail({ type: 'MAX_TICKET_TYPES_REACHED', message: 'Max reached' }),
      );

      await expect(controller.addTicketType('event-123', mockUser, addTicketDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for duplicate name', async () => {
      addTicketTypeHandler.execute.mockResolvedValue(
        Result.fail({ type: 'DUPLICATE_NAME', message: 'Duplicate name' }),
      );

      await expect(controller.addTicketType('event-123', mockUser, addTicketDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateTicketType', () => {
    const updateTicketDto: UpdateTicketTypeDto = {
      name: 'Super VIP',
    };

    it('should update ticket type successfully', async () => {
      updateTicketTypeHandler.execute.mockResolvedValue(Result.ok(undefined));

      const result = await controller.updateTicketType(
        'event-123',
        'ticket-123',
        mockUser,
        updateTicketDto,
      );

      expect(result.message).toBe('Ticket type updated successfully');
    });

    it('should throw NotFoundException when ticket type not found', async () => {
      updateTicketTypeHandler.execute.mockResolvedValue(
        Result.fail({ type: 'TICKET_TYPE_NOT_FOUND', message: 'Ticket type not found' }),
      );

      await expect(
        controller.updateTicketType('event-123', 'ticket-123', mockUser, updateTicketDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid quantity', async () => {
      updateTicketTypeHandler.execute.mockResolvedValue(
        Result.fail({ type: 'INVALID_QUANTITY', message: 'Invalid quantity' }),
      );

      await expect(
        controller.updateTicketType('event-123', 'ticket-123', mockUser, updateTicketDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeTicketType', () => {
    it('should remove ticket type successfully', async () => {
      removeTicketTypeHandler.execute.mockResolvedValue(Result.ok(undefined));

      const result = await controller.removeTicketType('event-123', 'ticket-123', mockUser);

      expect(result.message).toBe('Ticket type removed successfully');
    });

    it('should throw NotFoundException when event not found', async () => {
      removeTicketTypeHandler.execute.mockResolvedValue(
        Result.fail({ type: 'EVENT_NOT_FOUND', message: 'Event not found' }),
      );

      await expect(
        controller.removeTicketType('event-123', 'ticket-123', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when has sales', async () => {
      removeTicketTypeHandler.execute.mockResolvedValue(
        Result.fail({ type: 'HAS_SALES', message: 'Has sales' }),
      );

      await expect(
        controller.removeTicketType('event-123', 'ticket-123', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when event not draft', async () => {
      removeTicketTypeHandler.execute.mockResolvedValue(
        Result.fail({ type: 'EVENT_NOT_DRAFT', message: 'Not draft' }),
      );

      await expect(
        controller.removeTicketType('event-123', 'ticket-123', mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrganizerEvents', () => {
    it('should return organizer events', async () => {
      getOrganizerEventsHandler.execute.mockResolvedValue(Result.ok(mockPaginatedResult));

      const result = await controller.getOrganizerEvents(
        'user-123',
        mockUser,
        undefined,
        1,
        20,
      );

      expect(result).toEqual(mockPaginatedResult);
    });

    it('should throw ForbiddenException when accessing other organizers events', async () => {
      const otherUser = { ...mockUser, userId: 'other-user', role: 'ORGANIZER' };

      await expect(
        controller.getOrganizerEvents('user-123', otherUser, undefined, 1, 20),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to view any organizers events', async () => {
      getOrganizerEventsHandler.execute.mockResolvedValue(Result.ok(mockPaginatedResult));
      const adminUser = { ...mockUser, role: 'ADMIN' };

      const result = await controller.getOrganizerEvents(
        'other-user',
        adminUser,
        undefined,
        1,
        20,
      );

      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('uploadEventImage', () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('should upload image successfully', async () => {
      uploadEventImageHandler.execute.mockResolvedValue(
        Result.ok({
          imageUrl: 'https://s3.example.com/image.jpg',
          thumbnailUrl: 'https://s3.example.com/thumb.jpg',
        }),
      );

      const result = await controller.uploadEventImage('event-123', mockUser, mockFile);

      expect(result.imageUrl).toBe('https://s3.example.com/image.jpg');
      expect(result.thumbnailUrl).toBe('https://s3.example.com/thumb.jpg');
    });

    it('should throw BadRequestException when no file uploaded', async () => {
      await expect(
        controller.uploadEventImage('event-123', mockUser, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when event not found', async () => {
      uploadEventImageHandler.execute.mockResolvedValue(
        Result.fail({ type: 'EVENT_NOT_FOUND', message: 'Event not found' }),
      );

      await expect(controller.uploadEventImage('event-123', mockUser, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when not organizer', async () => {
      uploadEventImageHandler.execute.mockResolvedValue(
        Result.fail({ type: 'NOT_ORGANIZER', message: 'Not organizer' }),
      );

      await expect(controller.uploadEventImage('event-123', mockUser, mockFile)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
