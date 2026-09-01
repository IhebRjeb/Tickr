import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiProperty,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@shared/infrastructure/common/decorators/current-user.decorator';
import { Public } from '@shared/infrastructure/common/decorators/public.decorator';
import { Roles } from '@shared/infrastructure/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@shared/infrastructure/common/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/infrastructure/common/guards/roles.guard';

import {
  // Commands
  CreateEventCommand,
  CreateEventHandler,
  UpdateEventCommand,
  UpdateEventHandler,
  PublishEventCommand,
  PublishEventHandler,
  CancelEventCommand,
  CancelEventHandler,
  AddTicketTypeCommand,
  AddTicketTypeHandler,
  UpdateTicketTypeCommand,
  UpdateTicketTypeHandler,
  RemoveTicketTypeCommand,
  RemoveTicketTypeHandler,
  UploadEventImageCommand,
  UploadEventImageHandler,
  SetEventCommissionOverrideCommand,
  SetEventCommissionOverrideHandler,
  AssignEventCheckInStaffCommand,
  AssignEventCheckInStaffHandler,
  RevokeEventCheckInStaffCommand,
  RevokeEventCheckInStaffHandler,
  // Queries
  GetEventByIdQuery,
  GetEventByIdHandler,
  GetPublishedEventsQuery,
  GetPublishedEventsHandler,
  SearchEventsQuery,
  SearchEventsHandler,
  GetEventsByCategoryQuery,
  GetEventsByCategoryHandler,
  GetUpcomingEventsQuery,
  GetUpcomingEventsHandler,
  GetOrganizerEventsQuery,
  GetOrganizerEventsHandler,
  GetEventCheckInStaffQuery,
  GetEventCheckInStaffHandler,
  GetMyEventCheckInAccessQuery,
  GetMyEventCheckInAccessHandler,
  // DTOs
  CreateEventDto,
  UpdateEventDto,
  AddTicketTypeDto,
  UpdateTicketTypeDto,
  EventDto,
  PaginatedEventListDto,
  EventFilterDto,
  CancelEventDto,
  SetEventCommissionOverrideDto,
  AssignEventCheckInStaffDto,
  EventCheckInStaffAssignmentDto,
  PaginatedEventCheckInStaffAssignmentsDto,
  PaginatedEventCheckInAccessDto,
  PaginationDto,
} from '../../application';
import { EventCategory } from '../../domain/value-objects/event-category.vo';
import { EventStatus } from '../../domain/value-objects/event-status.vo';
import { IsEventOwnerGuard } from '../guards/is-event-owner.guard';

// ============================================
// Response DTOs
// ============================================

/**
 * Generic success response
 */
class SuccessResponse {
  message!: string;
}

/**
 * Event creation response
 */
class CreateEventResponse {
  eventId!: string;
  status!: string;
  message!: string;
}

/**
 * Add ticket type response
 */
class AddTicketTypeResponse {
  ticketTypeId!: string;
  message!: string;
}

/**
 * Image upload response
 */
class ImageUploadResponse {
  imageUrl!: string;
  thumbnailUrl?: string;
}

class EventCommissionResponse {
  @ApiProperty({
    description: 'Event whose commission configuration was updated',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  eventId!: string;

  @ApiProperty({
    description: 'Stored event override, or null to inherit the global rate',
    nullable: true,
    example: 0.03,
  })
  commissionRateOverride!: number | null;

  @ApiProperty({
    description: 'Commission rate applied to new orders after this update',
    example: 0.03,
  })
  effectiveCommissionRate!: number;

  @ApiProperty({
    description: 'Whether the event currently inherits the global rate',
    example: false,
  })
  usesGlobalRate!: boolean;
}

// ============================================
// Request User Interface
// ============================================

interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

// ============================================
// File Upload Configuration
// ============================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Multer file upload options
 */
const fileUploadOptions = {
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new UnsupportedMediaTypeException(
          `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
};

// ============================================
// Events Controller
// ============================================

/**
 * Events Controller
 *
 * Handles all event-related HTTP endpoints:
 * - Public: Browse, search, and view events
 * - Protected: Create, update, publish, cancel events (organizers only)
 * - Protected: Manage ticket types (organizers only)
 * - Protected: Upload event images (organizers only)
 *
 * @route /api/events
 */
@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(
    // Command Handlers
    private readonly createEventHandler: CreateEventHandler,
    private readonly updateEventHandler: UpdateEventHandler,
    private readonly publishEventHandler: PublishEventHandler,
    private readonly cancelEventHandler: CancelEventHandler,
    private readonly addTicketTypeHandler: AddTicketTypeHandler,
    private readonly updateTicketTypeHandler: UpdateTicketTypeHandler,
    private readonly removeTicketTypeHandler: RemoveTicketTypeHandler,
    private readonly uploadEventImageHandler: UploadEventImageHandler,
    private readonly setEventCommissionOverrideHandler: SetEventCommissionOverrideHandler,
    private readonly assignEventCheckInStaffHandler: AssignEventCheckInStaffHandler,
    private readonly revokeEventCheckInStaffHandler: RevokeEventCheckInStaffHandler,
    // Query Handlers
    private readonly getEventByIdHandler: GetEventByIdHandler,
    private readonly getPublishedEventsHandler: GetPublishedEventsHandler,
    private readonly searchEventsHandler: SearchEventsHandler,
    private readonly getEventsByCategoryHandler: GetEventsByCategoryHandler,
    private readonly getUpcomingEventsHandler: GetUpcomingEventsHandler,
    private readonly getOrganizerEventsHandler: GetOrganizerEventsHandler,
    private readonly getEventCheckInStaffHandler: GetEventCheckInStaffHandler,
    private readonly getMyEventCheckInAccessHandler: GetMyEventCheckInAccessHandler,
  ) {}

  // ============================================
  // Public Endpoints
  // ============================================

  /**
   * Get published events with filters
   *
   * @route GET /api/events
   */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get published events with filters' })
  @ApiQuery({ name: 'category', required: false, enum: EventCategory })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated list of events', type: PaginatedEventListDto })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async getPublishedEvents(
    @Query() filters: EventFilterDto,
  ): Promise<PaginatedEventListDto> {
    const query = new GetPublishedEventsQuery(
      {
        category: filters.category,
        city: filters.city,
        country: filters.country,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
      },
      filters.page ?? 1,
      filters.limit ?? 20,
      filters.sortBy,
      filters.sortOrder,
    );

    const result = await this.getPublishedEventsHandler.execute(query);

    // GetPublishedEventsQuery never fails
    return result.value!;
  }

  /**
   * Search events by query string
   *
   * @route GET /api/events/search
   */
  @Get('search')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search events by title' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Search results', type: PaginatedEventListDto })
  async searchEvents(
    @Query('q') searchQuery: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedEventListDto> {
    if (!searchQuery || searchQuery.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const query = new SearchEventsQuery(
      searchQuery.trim(),
      page ?? 1,
      limit ?? 20,
    );

    const result = await this.searchEventsHandler.execute(query);

    if (!result.isSuccess) {
      const error = result.error!;
      switch (error.type) {
        case 'INVALID_SEARCH_TERM':
          throw new BadRequestException(error.message);
        default:
          throw new BadRequestException(error.message);
      }
    }

    return result.value!;
  }

  /**
   * Get events by category
   *
   * @route GET /api/events/category/:category
   */
  @Get('category/:category')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get events by category' })
  @ApiParam({ name: 'category', enum: EventCategory })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Events in category', type: PaginatedEventListDto })
  @ApiResponse({ status: 400, description: 'Invalid category' })
  async getEventsByCategory(
    @Param('category') category: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedEventListDto> {
    // Validate category
    const validCategories = Object.values(EventCategory);
    const upperCategory = category.toUpperCase() as EventCategory;

    if (!validCategories.includes(upperCategory)) {
      throw new BadRequestException(
        `Invalid category. Valid categories: ${validCategories.join(', ')}`,
      );
    }

    const query = new GetEventsByCategoryQuery(
      upperCategory,
      page ?? 1,
      limit ?? 20,
    );

    const result = await this.getEventsByCategoryHandler.execute(query);
    return result.value!;
  }

  /**
   * Get upcoming events
   *
   * @route GET /api/events/upcoming
   */
  @Get('upcoming')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get upcoming events' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Upcoming events', type: PaginatedEventListDto })
  async getUpcomingEvents(
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedEventListDto> {
    const query = new GetUpcomingEventsQuery(
      city,
      country,
      page ?? 1,
      limit ?? 20,
    );

    const result = await this.getUpcomingEventsHandler.execute(query);
    return result.value!;
  }

  @Get('check-in-access/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List events the current user may check in' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated upcoming check-in events',
    type: PaginatedEventCheckInAccessDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account cannot access check-in' })
  async getMyEventCheckInAccess(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedEventCheckInAccessDto> {
    const result = await this.getMyEventCheckInAccessHandler.execute(
      new GetMyEventCheckInAccessQuery(
        user.userId,
        pagination.page ?? 1,
        pagination.limit ?? 20,
      ),
    );

    if (result.isFailure) {
      throw new ForbiddenException(result.error.message);
    }

    return result.value;
  }

  /**
   * Get event by ID
   *
   * @route GET /api/events/:id
   */
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event details', type: EventDto })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: RequestUser,
  ): Promise<EventDto> {
    const query = new GetEventByIdQuery(id, user?.userId);

    const result = await this.getEventByIdHandler.execute(query);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
      }
    }

    return result.value!;
  }

  // ============================================
  // Protected Endpoints - Organizer Events
  // ============================================

  /**
   * Get organizer's events
   *
   * @route GET /api/events/organizer/:organizerId
   */
  @Get('organizer/:organizerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get events by organizer' })
  @ApiParam({ name: 'organizerId', description: 'Organizer user UUID' })
  @ApiQuery({ name: 'status', required: false, enum: EventStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organizer events', type: PaginatedEventListDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only view own events' })
  async getOrganizerEvents(
    @Param('organizerId', ParseUUIDPipe) organizerId: string,
    @CurrentUser() user: RequestUser,
    @Query('status') status?: EventStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedEventListDto> {
    // Organizers can only view their own events (unless admin)
    if (user.role !== 'ADMIN' && user.userId !== organizerId) {
      throw new ForbiddenException('You can only view your own events');
    }

    const query = new GetOrganizerEventsQuery(
      organizerId,
      status,
      page ?? 1,
      limit ?? 20,
    );

    const result = await this.getOrganizerEventsHandler.execute(query);
    return result.value!;
  }

  @Post(':id/check-in-staff')
  @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
  @Roles('ORGANIZER')
  @Throttle({
    short: { ttl: 1000, limit: 3 },
    medium: { ttl: 10000, limit: 10 },
    long: { ttl: 3600000, limit: 20 },
  })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign check-in staff to an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiBody({ type: AssignEventCheckInStaffDto })
  @ApiResponse({
    status: 201,
    description: 'Check-in staff assigned',
    type: EventCheckInStaffAssignmentDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not event owner' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 409, description: 'User already assigned' })
  @ApiResponse({ status: 422, description: 'User is not eligible' })
  async assignEventCheckInStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AssignEventCheckInStaffDto,
  ): Promise<EventCheckInStaffAssignmentDto> {
    const result = await this.assignEventCheckInStaffHandler.execute(
      new AssignEventCheckInStaffCommand(id, user.userId, dto.email),
    );

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
        case 'ALREADY_ASSIGNED':
          throw new ConflictException(error.message);
        case 'EVENT_NOT_ASSIGNABLE':
          throw new BadRequestException(error.message);
        case 'TARGET_NOT_ELIGIBLE':
          throw new UnprocessableEntityException(error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }

    return result.value;
  }

  @Get(':id/check-in-staff')
  @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
  @Roles('ORGANIZER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active check-in staff for an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated active check-in staff',
    type: PaginatedEventCheckInStaffAssignmentsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not event owner' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventCheckInStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedEventCheckInStaffAssignmentsDto> {
    const result = await this.getEventCheckInStaffHandler.execute(
      new GetEventCheckInStaffQuery(
        id,
        user.userId,
        pagination.page ?? 1,
        pagination.limit ?? 20,
      ),
    );

    if (result.isFailure) {
      if (result.error.type === 'EVENT_NOT_FOUND') {
        throw new NotFoundException(result.error.message);
      }
      throw new ForbiddenException(result.error.message);
    }

    return result.value;
  }

  @Delete(':id/check-in-staff/:assignmentId')
  @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
  @Roles('ORGANIZER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an event check-in staff assignment' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment UUID' })
  @ApiResponse({ status: 204, description: 'Assignment revoked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not event owner' })
  @ApiResponse({ status: 404, description: 'Event or assignment not found' })
  async revokeEventCheckInStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    const result = await this.revokeEventCheckInStaffHandler.execute(
      new RevokeEventCheckInStaffCommand(id, assignmentId, user.userId),
    );

    if (result.isFailure) {
      switch (result.error.type) {
        case 'EVENT_NOT_FOUND':
        case 'ASSIGNMENT_NOT_FOUND':
          throw new NotFoundException(result.error.message);
        case 'ACCESS_DENIED':
          throw new ForbiddenException(result.error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(result.error.message);
      }
    }
  }

  // ============================================
  // Protected Endpoints - Event CRUD
  // ============================================

  @Patch(':id/commission')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure an event-specific commission rate' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiBody({ type: SetEventCommissionOverrideDto })
  @ApiResponse({
    status: 200,
    description: 'Event commission configured',
    type: EventCommissionResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid commission rate' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async setEventCommissionOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: SetEventCommissionOverrideDto,
  ): Promise<EventCommissionResponse> {
    const result = await this.setEventCommissionOverrideHandler.execute(
      new SetEventCommissionOverrideCommand(id, user.userId, dto.commissionRate),
    );

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
        case 'EVENT_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'INVALID_COMMISSION_RATE':
          throw new BadRequestException(error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }

    return result.value;
  }

  /**
   * Create a new event
   *
   * @route POST /api/events
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created', type: CreateEventResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async createEvent(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateEventDto,
  ): Promise<CreateEventResponse> {
    const command = new CreateEventCommand(
      user.userId,
      dto.title,
      dto.category,
      {
        address: dto.location.address,
        city: dto.location.city,
        country: dto.location.country,
        postalCode: dto.location.postalCode,
        latitude: dto.location.latitude,
        longitude: dto.location.longitude,
      },
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.description,
    );

    const result = await this.createEventHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'USER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'NOT_ORGANIZER':
          throw new ForbiddenException(error.message);
        case 'INVALID_CATEGORY':
        case 'VALIDATION_ERROR':
        case 'INVALID_DATE_RANGE':
        case 'INVALID_LOCATION':
          throw new UnprocessableEntityException(error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }

    return {
      eventId: result.value!.eventId,
      status: 'DRAFT',
      message: 'Event created successfully',
    };
  }

  /**
   * Update an event
   *
   * @route PUT /api/events/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
  @Roles('ORGANIZER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event updated', type: EventDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not event owner' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async updateEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateEventDto,
  ): Promise<EventDto> {
    const command = new UpdateEventCommand(
      id,
      user.userId,
      dto.title,
      dto.description,
      dto.category,
      dto.location
        ? {
            address: dto.location.address,
            city: dto.location.city,
            country: dto.location.country,
            postalCode: dto.location.postalCode,
            latitude: dto.location.latitude,
            longitude: dto.location.longitude,
          }
        : undefined,
      dto.startDate ? new Date(dto.startDate) : undefined,
      dto.endDate ? new Date(dto.endDate) : undefined,
    );

    const result = await this.updateEventHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'NOT_OWNER':
          throw new ForbiddenException(error.message);
        case 'NO_CHANGES':
        case 'CANNOT_MODIFY':
          throw new BadRequestException(error.message);
        case 'VALIDATION_ERROR':
        case 'INVALID_DATE_RANGE':
        case 'INVALID_LOCATION':
          throw new UnprocessableEntityException(error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }

    // Fetch updated event to return full details
    const queryResult = await this.getEventByIdHandler.execute(
      new GetEventByIdQuery(id, user.userId),
    );

    return queryResult.value!;
  }

  /**
   * Cancel an event
   *
   * @route DELETE /api/events/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
  @Roles('ORGANIZER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiBody({ type: CancelEventDto })
  @ApiResponse({ status: 200, description: 'Event cancelled', type: SuccessResponse })
  @ApiResponse({ status: 400, description: 'Cannot cancel event' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not event owner' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async cancelEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CancelEventDto,
  ): Promise<SuccessResponse> {
    const command = new CancelEventCommand(id, user.userId, dto.reason);

    const result = await this.cancelEventHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'NOT_OWNER':
          throw new ForbiddenException(error.message);
        case 'ALREADY_CANCELLED':
        case 'ALREADY_COMPLETED':
        case 'ALREADY_STARTED':
        case 'WRONG_STATUS':
          throw new BadRequestException(error.message);
        case 'MISSING_REASON':
        case 'VALIDATION_ERROR':
          throw new UnprocessableEntityException(error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }

    return { message: 'Event cancelled successfully' };
  }

  /**
   * Publish an event
   *
   * @route POST /api/events/:id/publish
   */
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
  @Roles('ORGANIZER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event published', type: SuccessResponse })
  @ApiResponse({ status: 400, description: 'Cannot publish event' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not event owner' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async publishEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponse> {
    const command = new PublishEventCommand(id, user.userId);

    const result = await this.publishEventHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'NOT_OWNER':
          throw new ForbiddenException(error.message);
        case 'WRONG_STATUS':
        case 'MISSING_TITLE':
        case 'MISSING_LOCATION':
        case 'MISSING_TICKET_TYPES':
        case 'EVENT_DATE_IN_PAST':
          throw new BadRequestException(error.message);
        case 'VALIDATION_ERROR':
          throw new UnprocessableEntityException(error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }

    return { message: 'Event published successfully' };
  }

  // ============================================
  // Protected Endpoints - Ticket Types
  // ============================================

  /**
   * Add a ticket type to an event
   *
   * @route POST /api/events/:id/ticket-types
   */
  @Post(':id/ticket-types')
  @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
  @Roles('ORGANIZER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a ticket type to an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 201, description: 'Ticket type added', type: AddTicketTypeResponse })
  @ApiResponse({ status: 400, description: 'Cannot add ticket type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not event owner' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async addTicketType(
    @Param('id', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AddTicketTypeDto,
  ): Promise<AddTicketTypeResponse> {
    const command = new AddTicketTypeCommand(
      eventId,
      user.userId,
      dto.name,
      dto.price,
      dto.currency,
      dto.quantity,
      new Date(dto.salesStartDate),
      new Date(dto.salesEndDate),
      dto.description,
    );

    const result = await this.addTicketTypeHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'NOT_OWNER':
          throw new ForbiddenException(error.message);
        case 'DUPLICATE_NAME':
        case 'MAX_TICKET_TYPES_REACHED':
        case 'INVALID_PRICE':
        case 'INVALID_SALES_PERIOD':
        case 'INVALID_TICKET_TYPE':
        case 'CANNOT_MODIFY':
          throw new BadRequestException(error.message);
        case 'VALIDATION_ERROR':
          throw new UnprocessableEntityException(error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }

    return {
      ticketTypeId: result.value!.ticketTypeId,
      message: 'Ticket type added successfully',
    };
  }

  /**
   * Update a ticket type
   *
   * @route PUT /api/events/:id/ticket-types/:typeId
   */
  @Put(':id/ticket-types/:typeId')
  @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
  @Roles('ORGANIZER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a ticket type' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiParam({ name: 'typeId', description: 'Ticket type UUID' })
  @ApiResponse({ status: 200, description: 'Ticket type updated', type: SuccessResponse })
  @ApiResponse({ status: 400, description: 'Cannot update ticket type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not event owner' })
  @ApiResponse({ status: 404, description: 'Event or ticket type not found' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async updateTicketType(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Param('typeId', ParseUUIDPipe) ticketTypeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateTicketTypeDto,
  ): Promise<SuccessResponse> {
    const command = new UpdateTicketTypeCommand(
      eventId,
      ticketTypeId,
      user.userId,
      dto.name,
      dto.description,
      dto.price,
      dto.currency,
      dto.quantity,
      dto.salesStartDate ? new Date(dto.salesStartDate) : undefined,
      dto.salesEndDate ? new Date(dto.salesEndDate) : undefined,
    );

    const result = await this.updateTicketTypeHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
        case 'TICKET_TYPE_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'NOT_OWNER':
          throw new ForbiddenException(error.message);
        case 'NO_CHANGES':
        case 'INVALID_PRICE':
        case 'INVALID_QUANTITY':
        case 'INVALID_SALES_PERIOD':
        case 'CANNOT_MODIFY_AFTER_SALES':
          throw new BadRequestException(error.message);
        case 'VALIDATION_ERROR':
          throw new UnprocessableEntityException(error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }

    return { message: 'Ticket type updated successfully' };
  }

  /**
   * Remove a ticket type
   *
   * @route DELETE /api/events/:id/ticket-types/:typeId
   */
  @Delete(':id/ticket-types/:typeId')
  @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
  @Roles('ORGANIZER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a ticket type from an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiParam({ name: 'typeId', description: 'Ticket type UUID' })
  @ApiResponse({ status: 200, description: 'Ticket type removed', type: SuccessResponse })
  @ApiResponse({ status: 400, description: 'Cannot remove ticket type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not event owner' })
  @ApiResponse({ status: 404, description: 'Event or ticket type not found' })
  async removeTicketType(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Param('typeId', ParseUUIDPipe) ticketTypeId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponse> {
    const command = new RemoveTicketTypeCommand(eventId, ticketTypeId, user.userId);

    const result = await this.removeTicketTypeHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
        case 'TICKET_TYPE_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'NOT_OWNER':
          throw new ForbiddenException(error.message);
        case 'EVENT_NOT_DRAFT':
        case 'HAS_SALES':
          throw new BadRequestException(error.message);
        case 'VALIDATION_ERROR':
          throw new UnprocessableEntityException(error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }

    return { message: 'Ticket type removed successfully' };
  }

  // ============================================
  // Protected Endpoints - Image Upload
  // ============================================

  /**
   * Upload event image
   *
   * @route POST /api/events/:id/image
   */
  @Post(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
  @Roles('ORGANIZER')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', fileUploadOptions))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload event image' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Image uploaded', type: ImageUploadResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not event owner' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @ApiResponse({ status: 415, description: 'Unsupported media type' })
  async uploadEventImage(
    @Param('id', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImageUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const command = new UploadEventImageCommand(
      eventId,
      user.userId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    const result = await this.uploadEventImageHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'NOT_ORGANIZER':
          throw new ForbiddenException(error.message);
        case 'EVENT_NOT_MODIFIABLE':
          throw new BadRequestException(error.message);
        case 'INVALID_FILE_TYPE':
          throw new UnsupportedMediaTypeException(error.message);
        case 'FILE_TOO_LARGE':
          throw new PayloadTooLargeException(error.message);
        case 'UPLOAD_FAILED':
          throw new BadRequestException(error.message);
      }
    }

    return {
      imageUrl: result.value!.imageUrl,
      thumbnailUrl: result.value!.thumbnailUrl,
    };
  }
}
