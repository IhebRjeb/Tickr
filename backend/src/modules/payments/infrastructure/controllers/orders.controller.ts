import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../users/infrastructure/decorators/auth.decorators';
import { JwtAuthGuard } from '../../../users/infrastructure/guards/jwt-auth.guard';
import { CreateOrderCommand } from '../../application/commands/create-order/create-order.command';
import { CreateOrderHandler } from '../../application/commands/create-order/create-order.handler';
import { ProcessPaymentCommand } from '../../application/commands/process-payment/process-payment.command';
import { ProcessPaymentHandler } from '../../application/commands/process-payment/process-payment.handler';
import { RequestRefundCommand } from '../../application/commands/request-refund/request-refund.command';
import { RequestRefundHandler } from '../../application/commands/request-refund/request-refund.handler';
import { GetOrderByIdHandler } from '../../application/queries/get-order-by-id/get-order-by-id.handler';
import { GetOrderByIdQuery } from '../../application/queries/get-order-by-id/get-order-by-id.query';
import { GetOrdersByUserHandler } from '../../application/queries/get-orders-by-user/get-orders-by-user.handler';
import { GetOrdersByUserQuery } from '../../application/queries/get-orders-by-user/get-orders-by-user.query';

import {
  CreateOrderRequestDto,
  ProcessPaymentRequestDto,
  RequestRefundRequestDto,
  PaginationQueryDto,
} from './dtos/request.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token' })
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly createOrderHandler: CreateOrderHandler,
    private readonly processPaymentHandler: ProcessPaymentHandler,
    private readonly requestRefundHandler: RequestRefundHandler,
    private readonly getOrderByIdHandler: GetOrderByIdHandler,
    private readonly getOrdersByUserHandler: GetOrdersByUserHandler,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or business rule violation' })
  @ApiResponse({ status: 429, description: 'Rate limited' })
  async createOrder(
    @CurrentUser() user: { userId: string; role: string },
    @Body() dto: CreateOrderRequestDto,
  ) {
    const command = new CreateOrderCommand(
      user.userId,
      dto.eventId,
      dto.items.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        holders: item.holders,
      })),
      {
        holderFirstName: dto.holder.firstName,
        holderLastName: dto.holder.lastName,
        holderEmail: dto.holder.email,
      },
    );

    const result = await this.createOrderHandler.execute(command);

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
        case 'TICKET_TYPE_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'RATE_LIMITED':
          throw new ForbiddenException(error.message);
        default:
          throw new BadRequestException(error.message);
      }
    }

    return result.value;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List current user orders (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated orders list' })
  async getMyOrders(
    @CurrentUser() user: { userId: string; role: string },
    @Query() pagination: PaginationQueryDto,
  ) {
    const query = new GetOrdersByUserQuery(
      user.userId,
      user.userId,
      user.role === 'ADMIN',
      pagination.page,
      pagination.limit,
    );

    const result = await this.getOrdersByUserHandler.execute(query);

    if (result.isFailure) {
      throw new ForbiddenException(result.error.message);
    }

    return result.value;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get order details by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getOrderById(
    @CurrentUser() user: { userId: string; role: string },
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    const query = new GetOrderByIdQuery(
      orderId,
      user.userId,
      user.role === 'ADMIN',
    );

    const result = await this.getOrderByIdHandler.execute(query);

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'ORDER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
      }
    }

    return result.value;
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process payment for an order' })
  @ApiResponse({ status: 200, description: 'Payment initiated, returns redirect URL or client secret' })
  @ApiResponse({ status: 400, description: 'Invalid order state or gateway error' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async processPayment(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: ProcessPaymentRequestDto,
  ) {
    const command = new ProcessPaymentCommand(
      orderId,
      user.userId,
      dto.paymentMethod,
      dto.idempotencyKey,
    );

    const result = await this.processPaymentHandler.execute(command);

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'ORDER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'ORDER_EXPIRED':
        case 'INVALID_STATUS':
        case 'MAX_ATTEMPTS_EXCEEDED':
        case 'GATEWAY_ERROR':
          throw new BadRequestException(error.message);
        default:
          throw new BadRequestException(error.message);
      }
    }

    return result.value;
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a refund for an order' })
  @ApiResponse({ status: 200, description: 'Refund requested' })
  @ApiResponse({ status: 400, description: 'Refund not allowed or gateway error' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async requestRefund(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: RequestRefundRequestDto,
  ) {
    const command = new RequestRefundCommand(
      orderId,
      user.userId,
      dto.reason,
    );

    const result = await this.requestRefundHandler.execute(command);

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'ORDER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'INVALID_STATUS':
        case 'REFUND_NOT_ALLOWED':
        case 'GATEWAY_ERROR':
          throw new BadRequestException(error.message);
        default:
          throw new BadRequestException(error.message);
      }
    }

    return result.value;
  }
}
