/**
 * @file CreateEventHandler Unit Tests
 * @description Tests for CreateEvent command handler
 */



import {
  CreateEventCommand,
  CreateEventHandler,
} from '@modules/events/application/commands/create-event';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import type {
  UserValidationServicePort,
  UserValidationResultInterface,
} from '@modules/events/application/ports/user-validation.service.port';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('CreateEventHandler', () => {
  let handler: CreateEventHandler;
  let mockEventRepository: jest.Mocked<EventRepositoryPort>;
  let mockUserValidationService: jest.Mocked<UserValidationServicePort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  // Test data
  const validOrganizerId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const validLocation = {
    city: 'Tunis',
    country: 'Tunisia',
    address: '123 Test Street',
    latitude: 36.8065,
    longitude: 10.1815,
  };
  const validStartDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const validEndDate = new Date(validStartDate.getTime() + 2 * 24 * 60 * 60 * 1000);

  beforeEach(() => {
    // Create mocks
    mockEventRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByOrganizerId: jest.fn(),
      findPublished: jest.fn(),
      findByCategory: jest.fn(),
      searchByTitle: jest.fn(),
      findUpcoming: jest.fn(),
      findByDateRange: jest.fn(),
      findEventsToComplete: jest.fn(),
      countByOrganizer: jest.fn(),
      countByCategory: jest.fn(),
      countPublished: jest.fn(),
      exists: jest.fn(),
      existsByOrganizer: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockUserValidationService = {
      validateOrganizer: jest.fn(),
      userExists: jest.fn(),
      hasRole: jest.fn(),
      isEventOwner: jest.fn(),
    };

    mockEventPublisher = {
      publishFromAggregate: jest.fn(),
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as any;

    // Create handler
    handler = new CreateEventHandler(
      mockEventRepository,
      mockUserValidationService,
      mockEventPublisher,
    );

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Helper Functions
  // ============================================

  const createValidCommand = (overrides?: Partial<CreateEventCommand>): CreateEventCommand => {
    return new CreateEventCommand(
      overrides?.organizerId ?? validOrganizerId,
      overrides?.title ?? 'Summer Music Festival',
      overrides?.category ?? EventCategory.CONCERT,
      overrides?.location ?? validLocation,
      overrides?.startDate ?? validStartDate,
      overrides?.endDate ?? validEndDate,
      overrides?.description ?? 'A great music festival',
      overrides?.imageUrl ?? 'https://example.com/image.jpg',
    );
  };

  const mockValidOrganizerValidation = (): UserValidationResultInterface => ({
    exists: true,
    isOrganizer: true,
    isActive: true,
    role: 'ORGANIZER',
  });

  const mockSavedEvent = (command: CreateEventCommand): EventEntity => {
    const location = LocationVO.create(command.location);
    const dateRange = EventDateRangeVO.create(command.startDate, command.endDate, true);
    
    const eventResult = EventEntity.create({
      organizerId: command.organizerId,
      title: command.title,
      description: command.description,
      category: command.category,
      location,
      dateRange,
      imageUrl: command.imageUrl,
    });

    if (eventResult.isFailure) {
      throw new Error(`Failed to create event: ${eventResult.error.message}`);
    }

    return eventResult.value;
  };

  // ============================================
  // Success Cases
  // ============================================

  describe('Success Cases', () => {
    it('should create event successfully with valid data', async () => {
      // Arrange
      const command = createValidCommand();
      const savedEvent = mockSavedEvent(command);

      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );
      mockEventRepository.save.mockResolvedValue(savedEvent);
      mockEventPublisher.publishFromAggregate.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({ eventId: savedEvent.id });
      expect(mockUserValidationService.validateOrganizer).toHaveBeenCalledWith(validOrganizerId);
      expect(mockEventRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(1);
    });

    it('should create event with minimal data (no description, no image)', async () => {
      // Arrange
      const command = new CreateEventCommand(
        validOrganizerId,
        'Minimal Event',
        EventCategory.CONFERENCE,
        validLocation,
        validStartDate,
        validEndDate,
      );
      const savedEvent = mockSavedEvent(command);

      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );
      mockEventRepository.save.mockResolvedValue(savedEvent);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.eventId).toBeDefined();
    });

    it('should publish EventCreatedEvent after successful creation', async () => {
      // Arrange
      const command = createValidCommand();
      const savedEvent = mockSavedEvent(command);

      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );
      mockEventRepository.save.mockResolvedValue(savedEvent);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledWith(
        expect.any(Object),
      );
    });
  });

  // ============================================
  // User Validation Errors
  // ============================================

  describe('User Validation Errors', () => {
    it('should fail when user does not exist', async () => {
      // Arrange
      const command = createValidCommand();
      mockUserValidationService.validateOrganizer.mockResolvedValue({
        exists: false,
        isOrganizer: false,
        isActive: false,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('USER_NOT_FOUND');
      expect(result.error.message).toContain(validOrganizerId);
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when user is not an organizer', async () => {
      // Arrange
      const command = createValidCommand();
      mockUserValidationService.validateOrganizer.mockResolvedValue({
        exists: true,
        isOrganizer: false,
        isActive: true,
        role: 'PARTICIPANT',
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_ORGANIZER');
      expect(result.error.message).toContain('ORGANIZER role');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Location Validation Errors
  // ============================================

  describe('Location Validation Errors', () => {
    it('should fail with invalid location (missing city)', async () => {
      // Arrange
      const command = createValidCommand({
        location: {
          ...validLocation,
          city: '',
        },
      });
      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_LOCATION');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it('should fail with invalid location (missing country)', async () => {
      // Arrange
      const command = createValidCommand({
        location: {
          ...validLocation,
          country: '',
        },
      });
      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_LOCATION');
    });

    it('should fail with invalid coordinates (latitude out of range)', async () => {
      // Arrange
      const command = createValidCommand({
        location: {
          ...validLocation,
          latitude: 95, // Invalid: > 90
        },
      });
      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_LOCATION');
    });
  });

  // ============================================
  // Date Range Validation Errors
  // ============================================

  describe('Date Range Validation Errors', () => {
    it('should fail when end date is before start date', async () => {
      // Arrange
      const command = createValidCommand({
        startDate: validEndDate,
        endDate: validStartDate, // Swapped dates
      });
      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_DATE_RANGE');
      expect(mockEventRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when start date is in the past', async () => {
      // Arrange
      const pastDate = new Date('2020-01-01T10:00:00Z');
      const command = createValidCommand({
        startDate: pastDate,
        endDate: new Date('2020-01-02T10:00:00Z'),
      });
      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('INVALID_DATE_RANGE');
    });
  });

  // ============================================
  // Event Entity Validation Errors
  // ============================================

  describe('Event Entity Validation Errors', () => {
    it('should fail with invalid title (too short)', async () => {
      // Arrange
      const command = createValidCommand({
        title: '', // Empty title
      });
      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('VALIDATION_ERROR');
    });

    it('should fail with invalid title (too long)', async () => {
      // Arrange
      const command = createValidCommand({
        title: 'A'.repeat(201), // > 200 chars
      });
      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('VALIDATION_ERROR');
    });
  });

  // ============================================
  // Persistence Errors
  // ============================================

  describe('Persistence Errors', () => {
    it('should fail when repository save throws error', async () => {
      // Arrange
      const command = createValidCommand();
      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );
      mockEventRepository.save.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
      expect(result.error.message).toContain('Database connection failed');
      expect(mockEventPublisher.publishFromAggregate).not.toHaveBeenCalled();
    });

    it('should not publish events when save fails', async () => {
      // Arrange
      const command = createValidCommand();
      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );
      mockEventRepository.save.mockRejectedValue(new Error('Save failed'));

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventPublisher.publishFromAggregate).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle location without optional fields', async () => {
      // Arrange
      const minimalLocation = {
        city: 'Tunis',
        country: 'Tunisia',
      };
      const command = createValidCommand({ location: minimalLocation });
      const savedEvent = mockSavedEvent(command);

      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );
      mockEventRepository.save.mockResolvedValue(savedEvent);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should create event with all event categories', async () => {
      // Test all categories
      const categories = Object.values(EventCategory);

      for (const category of categories) {
        const command = createValidCommand({ category });
        const savedEvent = mockSavedEvent(command);

        mockUserValidationService.validateOrganizer.mockResolvedValue(
          mockValidOrganizerValidation(),
        );
        mockEventRepository.save.mockResolvedValue(savedEvent);

        const result = await handler.execute(command);

        expect(result.isSuccess).toBe(true);
      }
    });

    it('should handle multi-day events', async () => {
      // Arrange
      const startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      const command = createValidCommand({ startDate, endDate });
      const savedEvent = mockSavedEvent(command);

      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );
      mockEventRepository.save.mockResolvedValue(savedEvent);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
    });
  });

  // ============================================
  // Integration with Value Objects
  // ============================================

  describe('Integration with Value Objects', () => {
    it('should correctly create LocationVO from command data', async () => {
      // Arrange
      const locationData = {
        address: '456 Avenue Habib Bourguiba',
        city: 'Sousse',
        country: 'Tunisia',
        postalCode: '4000',
        latitude: 35.8256,
        longitude: 10.6369,
      };
      const command = createValidCommand({ location: locationData });
      const savedEvent = mockSavedEvent(command);

      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );
      mockEventRepository.save.mockResolvedValue(savedEvent);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      const savedEventArg = mockEventRepository.save.mock.calls[0][0];
      expect(savedEventArg.location.city).toBe(locationData.city);
      expect(savedEventArg.location.country).toBe(locationData.country);
    });

    it('should correctly create EventDateRangeVO from command data', async () => {
      // Arrange
      const command = createValidCommand();
      const savedEvent = mockSavedEvent(command);

      mockUserValidationService.validateOrganizer.mockResolvedValue(
        mockValidOrganizerValidation(),
      );
      mockEventRepository.save.mockResolvedValue(savedEvent);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      const savedEventArg = mockEventRepository.save.mock.calls[0][0];
      expect(savedEventArg.dateRange.startDate).toEqual(validStartDate);
      expect(savedEventArg.dateRange.endDate).toEqual(validEndDate);
    });
  });
});
