import { EventsModule } from '@modules/events/infrastructure/events.module';
import { TicketsModule } from '@modules/tickets/infrastructure/tickets.module';
import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfirmPaymentHandler } from '../application/commands/confirm-payment/confirm-payment.handler';
import { CreateOrderHandler } from '../application/commands/create-order/create-order.handler';
import { ExpireOrdersHandler } from '../application/commands/expire-orders/expire-orders.handler';
import { FailPaymentHandler } from '../application/commands/fail-payment/fail-payment.handler';
import { ProcessPaymentHandler } from '../application/commands/process-payment/process-payment.handler';
import { RequestRefundHandler } from '../application/commands/request-refund/request-refund.handler';
import { OrderFailedAppHandler } from '../application/event-handlers/order-failed-app.handler';
import { OrderPaidAppHandler } from '../application/event-handlers/order-paid-app.handler';
import { PAYMENT_EVENT_QUERY_PORT } from '../application/ports/event-query.port';
import { FRAUD_DETECTION_PORT } from '../application/ports/fraud-detection.port';
import { ORDER_REPOSITORY } from '../application/ports/order.repository.port';
import { PAYMENT_PROVIDER_FACTORY } from '../application/ports/payment-provider.port';
import { PAYMENT_REPOSITORY } from '../application/ports/payment.repository.port';
import { REFUND_REPOSITORY } from '../application/ports/refund.repository.port';
import { TICKET_RESERVATION_PORT } from '../application/ports/ticket-reservation.port';
import { GetOrderByIdHandler } from '../application/queries/get-order-by-id/get-order-by-id.handler';
import { GetOrdersByEventHandler } from '../application/queries/get-orders-by-event/get-orders-by-event.handler';
import { GetOrdersByUserHandler } from '../application/queries/get-orders-by-user/get-orders-by-user.handler';

import { PaymentEventQueryAdapter } from './adapters/event-query.adapter';
import { KonnectAdapter } from './adapters/konnect.adapter';
import { PaymeeAdapter } from './adapters/paymee.adapter';
import { PaymentProviderFactory } from './adapters/payment-provider.factory';
import { StripeAdapter } from './adapters/stripe.adapter';
import { TicketReservationAdapter } from './adapters/ticket-reservation.adapter';
import { OrdersController } from './controllers/orders.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { OrderCreatedInfraHandler } from './event-handlers/order-created-infra.handler';
import { OrderFailedInfraHandler } from './event-handlers/order-failed-infra.handler';
import { OrderPaidInfraHandler } from './event-handlers/order-paid-infra.handler';
import { OrderRefundedInfraHandler } from './event-handlers/order-refunded-infra.handler';
import { OrderItemOrmEntity } from './persistence/entities/order-item.orm-entity';
import { OrderOrmEntity } from './persistence/entities/order.orm-entity';
import { PaymentOrmEntity } from './persistence/entities/payment.orm-entity';
import { RefundOrmEntity } from './persistence/entities/refund.orm-entity';
import { OrderMapper } from './persistence/mappers/order.mapper';
import { PaymentMapper } from './persistence/mappers/payment.mapper';
import { RefundMapper } from './persistence/mappers/refund.mapper';
import { OrderTypeOrmRepository } from './repositories/order.repository';
import { PaymentTypeOrmRepository } from './repositories/payment.repository';
import { RefundTypeOrmRepository } from './repositories/refund.repository';
import { FraudDetectionService } from './services/fraud-detection.service';
import { OrderExpirationService } from './services/order-expiration.service';

// ============================================
// Command Handlers
// ============================================
const CommandHandlers = [
  CreateOrderHandler,
  ProcessPaymentHandler,
  ConfirmPaymentHandler,
  FailPaymentHandler,
  RequestRefundHandler,
  ExpireOrdersHandler,
];

// ============================================
// Query Handlers
// ============================================
const QueryHandlers = [
  GetOrderByIdHandler,
  GetOrdersByUserHandler,
  GetOrdersByEventHandler,
];

// ============================================
// Application Event Handlers (Business logic)
// ============================================
const AppEventHandlers = [
  OrderPaidAppHandler,
  OrderFailedAppHandler,
];

// ============================================
// Infrastructure Event Handlers (Side effects)
// ============================================
const InfraEventHandlers = [
  OrderCreatedInfraHandler,
  OrderPaidInfraHandler,
  OrderFailedInfraHandler,
  OrderRefundedInfraHandler,
];

// ============================================
// Repository Providers
// ============================================
const orderRepositoryProvider: Provider = {
  provide: ORDER_REPOSITORY,
  useClass: OrderTypeOrmRepository,
};

const paymentRepositoryProvider: Provider = {
  provide: PAYMENT_REPOSITORY,
  useClass: PaymentTypeOrmRepository,
};

const refundRepositoryProvider: Provider = {
  provide: REFUND_REPOSITORY,
  useClass: RefundTypeOrmRepository,
};

// ============================================
// Cross-Module Adapter Providers
// ============================================
const eventQueryProvider: Provider = {
  provide: PAYMENT_EVENT_QUERY_PORT,
  useClass: PaymentEventQueryAdapter,
};

const ticketReservationProvider: Provider = {
  provide: TICKET_RESERVATION_PORT,
  useClass: TicketReservationAdapter,
};

// ============================================
// Service Providers
// ============================================
const fraudDetectionProvider: Provider = {
  provide: FRAUD_DETECTION_PORT,
  useClass: FraudDetectionService,
};

const paymentProviderFactoryProvider: Provider = {
  provide: PAYMENT_PROVIDER_FACTORY,
  useClass: PaymentProviderFactory,
};

/**
 * Payments Module
 *
 * Bounded context for order management, payment processing, and refunds.
 *
 * Features:
 * - Order creation with fraud detection
 * - Payment processing via Stripe, Konnect, Paymee
 * - Webhook handling for async payment confirmations
 * - Refund processing
 * - Automatic order expiration (15-min TTL)
 * - Event-driven ticket confirmation/release
 *
 * Architecture:
 * - Hexagonal Architecture (Ports & Adapters)
 * - CQRS pattern for command/query separation
 * - Event-driven for cross-module communication
 * - Railway-oriented error handling (Result pattern)
 *
 * Cross-Module Dependencies:
 * - EventsModule: For event/ticket type validation
 * - TicketsModule: For ticket reservation management
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderOrmEntity,
      OrderItemOrmEntity,
      PaymentOrmEntity,
      RefundOrmEntity,
    ]),
    ConfigModule,
    EventsModule,
    TicketsModule,
  ],
  controllers: [OrdersController, WebhooksController],
  providers: [
    // Mappers
    OrderMapper,
    PaymentMapper,
    RefundMapper,

    // Repositories
    orderRepositoryProvider,
    paymentRepositoryProvider,
    refundRepositoryProvider,

    // Cross-module adapters
    eventQueryProvider,
    ticketReservationProvider,

    // Payment gateway adapters
    StripeAdapter,
    KonnectAdapter,
    PaymeeAdapter,
    paymentProviderFactoryProvider,

    // Services
    fraudDetectionProvider,
    OrderExpirationService,

    // Handlers
    ...CommandHandlers,
    ...QueryHandlers,
    ...AppEventHandlers,
    ...InfraEventHandlers,
  ],
  exports: [
    ORDER_REPOSITORY,
    PAYMENT_REPOSITORY,
  ],
})
export class PaymentsModule {}
