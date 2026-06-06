import { Injectable, Logger } from '@nestjs/common';

import type {
  PaymentProviderPort,
  PaymentProviderFactoryPort,
} from '../../application/ports/payment-provider.port';
import { PaymentMethod } from '../../domain/value-objects/payment-method.vo';

import { KonnectAdapter } from './konnect.adapter';
import { PaymeeAdapter } from './paymee.adapter';
import { StripeAdapter } from './stripe.adapter';

/**
 * Payment Provider Factory
 *
 * Returns the correct gateway adapter based on PaymentMethod.
 * Implements the Factory pattern for gateway selection.
 */
@Injectable()
export class PaymentProviderFactory implements PaymentProviderFactoryPort {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly providers: Map<PaymentMethod, PaymentProviderPort>;

  constructor(
    private readonly stripeAdapter: StripeAdapter,
    private readonly konnectAdapter: KonnectAdapter,
    private readonly paymeeAdapter: PaymeeAdapter,
  ) {
    this.providers = new Map<PaymentMethod, PaymentProviderPort>([
      [PaymentMethod.STRIPE, this.stripeAdapter],
      [PaymentMethod.KONNECT, this.konnectAdapter],
      [PaymentMethod.PAYMEE, this.paymeeAdapter],
    ]);
  }

  getProvider(method: PaymentMethod): PaymentProviderPort {
    const provider = this.providers.get(method);

    if (!provider) {
      this.logger.error(`Unsupported payment method: ${method}`);
      throw new Error(`Unsupported payment method: ${method}`);
    }

    return provider;
  }

  getSupportedMethods(): PaymentMethod[] {
    return Array.from(this.providers.keys());
  }
}
