import { DomainException } from '@shared/domain/domain-exception.base';

export class MaxItemsExceededException extends DomainException {
  constructor(max: number) {
    super(`Cannot exceed ${max} items per order`, 'MAX_ITEMS_EXCEEDED');
  }
}
