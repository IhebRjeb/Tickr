import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Redirect,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CurrentUser } from '@shared/infrastructure/common/decorators/current-user.decorator';
import { Roles } from '@shared/infrastructure/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@shared/infrastructure/common/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/infrastructure/common/guards/roles.guard';

import {
  // Commands
  ReserveTicketsCommand,
  ReserveTicketsHandler,
  ConfirmTicketsCommand,
  ConfirmTicketsHandler,
  CancelTicketsCommand,
  CancelTicketsHandler,
  CheckInTicketCommand,
  CheckInTicketHandler,
  TransferTicketCommand,
  TransferTicketHandler,
  // Queries
  GetTicketByIdQuery,
  GetTicketByIdHandler,
  GetUserTicketsQuery,
  GetUserTicketsHandler,
  GetEventCheckInStatsQuery,
  GetEventCheckInStatsHandler,
  // DTOs
  ReserveTicketsDto,
  ReserveTicketsResponseDto,
  ConfirmTicketsDto,
  ConfirmTicketsResponseDto,
  CancelTicketsDto,
  CheckInDto,
  CheckInResponseDto,
  TransferTicketDto,
  TransferTicketResponseDto,
  TicketDetailDto,
  PaginatedTicketListDto,
  CheckInStatsDto,
} from '../../application';
import { TicketS3StorageService } from '../services/ticket-s3-storage.service';

// ============================================
// Request User Interface
// ============================================

interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

// ============================================
// Tickets Controller
// ============================================

/**
 * Tickets Controller
 *
 * Handles all ticket-related HTTP endpoints:
 * - Reservation & confirmation (payment flow)
 * - User ticket listing and details
 * - PDF ticket download (S3 signed URL redirect)
 * - Ticket transfer to another user
 * - Check-in at venue entrance (organizer/staff)
 * - Check-in statistics (organizer dashboard)
 *
 * @route /api/tickets
 */
@ApiTags('Tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    // Command Handlers
    private readonly reserveTicketsHandler: ReserveTicketsHandler,
    private readonly confirmTicketsHandler: ConfirmTicketsHandler,
    private readonly cancelTicketsHandler: CancelTicketsHandler,
    private readonly checkInTicketHandler: CheckInTicketHandler,
    private readonly transferTicketHandler: TransferTicketHandler,
    // Query Handlers
    private readonly getTicketByIdHandler: GetTicketByIdHandler,
    private readonly getUserTicketsHandler: GetUserTicketsHandler,
    private readonly getEventCheckInStatsHandler: GetEventCheckInStatsHandler,
    // Infrastructure Services
    private readonly s3Storage: TicketS3StorageService,
  ) {}

  // ============================================
  // Reservation & Confirmation
  // ============================================

  /**
   * Reserve tickets for an event
   *
   * Creates a 15-minute reservation hold. Must be confirmed via payment.
   *
   * @route POST /api/tickets/reserve
   */
  @Post('reserve')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reserve tickets for an event' })
  @ApiBody({ type: ReserveTicketsDto })
  @ApiResponse({ status: 201, description: 'Tickets reserved', type: ReserveTicketsResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error or insufficient availability' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Event or ticket type not found' })
  async reserveTickets(
    @Body() dto: ReserveTicketsDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ReserveTicketsResponseDto> {
    const command = new ReserveTicketsCommand(
      dto.eventId,
      dto.ticketTypeId,
      user.userId,
      dto.holders,
    );

    const result = await this.reserveTicketsHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
        case 'TICKET_TYPE_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'EVENT_NOT_PUBLISHED':
        case 'INSUFFICIENT_AVAILABILITY':
        case 'VALIDATION_ERROR':
          throw new BadRequestException(error.message);
        default:
          throw new BadRequestException(error.message);
      }
    }

    return {
      ticketIds: result.value!.ticketIds,
      reservedUntil: result.value!.reservedUntil,
    };
  }

  /**
   * Confirm tickets after payment
   *
   * Transitions RESERVED tickets to CONFIRMED. Typically called
   * internally by the Payments module after successful payment.
   *
   * @route POST /api/tickets/confirm
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm tickets after payment' })
  @ApiBody({ type: ConfirmTicketsDto })
  @ApiResponse({ status: 200, description: 'Tickets confirmed', type: ConfirmTicketsResponseDto })
  @ApiResponse({ status: 400, description: 'Confirmation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tickets not found' })
  async confirmTickets(
    @Body() dto: ConfirmTicketsDto,
  ): Promise<ConfirmTicketsResponseDto> {
    const command = new ConfirmTicketsCommand(dto.ticketIds, dto.orderId);

    const result = await this.confirmTicketsHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'TICKETS_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'CONFIRMATION_FAILED':
        case 'PERSISTENCE_ERROR':
          throw new BadRequestException(error.message);
      }
    }

    return {
      confirmedIds: result.value!.confirmedIds,
    };
  }

  // ============================================
  // User Tickets
  // ============================================

  /**
   * Get authenticated user's tickets
   *
   * Returns paginated list of the current user's tickets.
   *
   * @route GET /api/tickets
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's own tickets" })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Paginated ticket list', type: PaginatedTicketListDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserTickets(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ): Promise<PaginatedTicketListDto> {
    const query = new GetUserTicketsQuery(
      user.userId,
      page ?? 1,
      limit ?? 20,
      status,
    );

    const result = await this.getUserTicketsHandler.execute(query);
    return result.value!;
  }

  /**
   * Get ticket by ID
   *
   * Returns detailed ticket information. Accessible by ticket owner
   * or the event organizer.
   *
   * @route GET /api/tickets/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ticket details' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket details', type: TicketDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getTicketById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<TicketDetailDto> {
    const query = new GetTicketByIdQuery(id, user.userId);

    const result = await this.getTicketByIdHandler.execute(query);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'TICKET_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
      }
    }

    return result.value!;
  }

  /**
   * Download ticket PDF
   *
   * Redirects to a signed S3 URL for the ticket PDF.
   * Only accessible by the ticket owner.
   *
   * @route GET /api/tickets/:id/pdf
   */
  @Get(':id/pdf')
  @Redirect()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download ticket PDF' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 302, description: 'Redirect to signed S3 URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Ticket not found or PDF not available' })
  async getTicketPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ url: string; statusCode: number }> {
    // First verify access
    const query = new GetTicketByIdQuery(id, user.userId);
    const result = await this.getTicketByIdHandler.execute(query);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'TICKET_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
      }
    }

    const ticket = result.value!;

    // Only ticket owner can download PDF
    if (ticket.userId !== user.userId) {
      throw new ForbiddenException('Only the ticket owner can download the PDF');
    }

    if (!ticket.pdfUrl) {
      throw new NotFoundException('PDF is not available for this ticket');
    }

    // pdfUrl stores the S3 key — generate a fresh signed URL for download
    const signedUrl = await this.s3Storage.generateSignedUrl(ticket.pdfUrl);

    return { url: signedUrl, statusCode: HttpStatus.FOUND };
  }

  // ============================================
  // Transfer
  // ============================================

  /**
   * Transfer ticket to another user
   *
   * Generates a new QR code and assigns ticket to the new owner.
   * Limited to 3 transfers per ticket. Only the current owner can transfer.
   *
   * @route POST /api/tickets/:id/transfer
   */
  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transfer ticket to another user' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiBody({ type: TransferTicketDto })
  @ApiResponse({ status: 200, description: 'Ticket transferred', type: TransferTicketResponseDto })
  @ApiResponse({ status: 400, description: 'Transfer failed (max transfers, invalid state)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the ticket owner' })
  @ApiResponse({ status: 404, description: 'Ticket or target user not found' })
  async transferTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferTicketDto,
    @CurrentUser() user: RequestUser,
  ): Promise<TransferTicketResponseDto> {
    const command = new TransferTicketCommand(
      id,
      user.userId,
      dto.newOwnerEmail,
    );

    const result = await this.transferTicketHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'TICKET_NOT_FOUND':
        case 'USER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'NOT_TICKET_OWNER':
          throw new ForbiddenException(error.message);
        case 'TRANSFER_FAILED':
        case 'PERSISTENCE_ERROR':
          throw new BadRequestException(error.message);
      }
    }

    return {
      newQrCode: result.value!.newQrCode,
    };
  }

  // ============================================
  // Ticket Cancellation
  // ============================================

  /**
   * Cancel tickets
   *
   * Cancels RESERVED or CONFIRMED tickets. Refund is initiated
   * for confirmed tickets.
   *
   * @route POST /api/tickets/cancel
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel tickets' })
  @ApiBody({ type: CancelTicketsDto })
  @ApiResponse({ status: 200, description: 'Tickets cancelled' })
  @ApiResponse({ status: 400, description: 'Cancellation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tickets not found' })
  async cancelTickets(
    @Body() dto: CancelTicketsDto,
    @CurrentUser() _user: RequestUser,
  ): Promise<{ message: string }> {
    const command = new CancelTicketsCommand(dto.ticketIds, dto.reason);

    const result = await this.cancelTicketsHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'TICKETS_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'CANCELLATION_FAILED':
        case 'PERSISTENCE_ERROR':
          throw new BadRequestException(error.message);
      }
    }

    return { message: 'Tickets cancelled successfully' };
  }

  // ============================================
  // Check-In (Staff / Organizer)
  // ============================================

  /**
   * Check in a ticket at venue entrance
   *
   * Validates QR code, checks time window, and records check-in.
   * Requires ORGANIZER role. Duplicate check-in attempts emit
   * a security alert.
   *
   * @route POST /api/tickets/check-in
   */
  @Post('check-in')
  @UseGuards(RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check in a ticket at venue entrance' })
  @ApiBody({ type: CheckInDto })
  @ApiResponse({ status: 200, description: 'Check-in result', type: CheckInResponseDto })
  @ApiResponse({ status: 400, description: 'Check-in failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Requires ORGANIZER role' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async checkInTicket(
    @Body() dto: CheckInDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CheckInResponseDto> {
    const command = new CheckInTicketCommand(
      dto.qrCode,
      user.userId,
      dto.deviceId,
      dto.locationGate,
    );

    const result = await this.checkInTicketHandler.execute(command);

    if (result.isFailure) {
      const error = result.error!;
      switch (error.type) {
        case 'INVALID_QR_CODE':
        case 'CHECK_IN_OUTSIDE_WINDOW':
        case 'CHECK_IN_FAILED':
          throw new BadRequestException(error.message);
        case 'TICKET_NOT_FOUND':
        case 'EVENT_NOT_FOUND':
          throw new NotFoundException(error.message);
        default:
          throw new BadRequestException(error.message);
      }
    }

    const checkInResult = result.value!;
    return {
      isValid: checkInResult.isValid,
      ticketId: checkInResult.ticketId,
      holderName: checkInResult.holderName,
      ticketTypeName: checkInResult.ticketTypeName,
      checkedInAt: checkInResult.checkedInAt,
      failureReason: checkInResult.failureReason,
    };
  }

  /**
   * Get check-in statistics for an event
   *
   * Returns aggregated check-in data for organizer dashboard.
   * Requires ORGANIZER role and event ownership.
   *
   * @route GET /api/tickets/event/:eventId/stats
   */
  @Get('event/:eventId/stats')
  @UseGuards(RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get check-in statistics for an event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Check-in statistics', type: CheckInStatsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Requires ORGANIZER role' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventCheckInStats(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<CheckInStatsDto> {
    const query = new GetEventCheckInStatsQuery(eventId, user.userId);

    const result = await this.getEventCheckInStatsHandler.execute(query);

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
}
