import { ValueObject } from '@shared/domain/value-object.base';

interface CheckInResultProps {
  isValid: boolean;
  ticketId: string;
  holderName: string;
  ticketTypeName: string;
  failureReason: string | null;
  checkedInAt: Date | null;
}

/**
 * Check-In Result Value Object
 *
 * Immutable result of a check-in attempt.
 * Captures success/failure with context for display at venue gates.
 */
export class CheckInResultVO extends ValueObject<CheckInResultProps> {
  private constructor(props: CheckInResultProps) {
    super(props);
  }

  get isValid(): boolean {
    return this.props.isValid;
  }

  get ticketId(): string {
    return this.props.ticketId;
  }

  get holderName(): string {
    return this.props.holderName;
  }

  get ticketTypeName(): string {
    return this.props.ticketTypeName;
  }

  get failureReason(): string | null {
    return this.props.failureReason;
  }

  get checkedInAt(): Date | null {
    return this.props.checkedInAt;
  }

  /**
   * Create a successful check-in result
   */
  static success(
    ticketId: string,
    holderName: string,
    ticketTypeName: string,
    checkedInAt: Date,
  ): CheckInResultVO {
    return new CheckInResultVO({
      isValid: true,
      ticketId,
      holderName,
      ticketTypeName,
      failureReason: null,
      checkedInAt,
    });
  }

  /**
   * Create a failed check-in result
   */
  static failure(
    ticketId: string,
    holderName: string,
    ticketTypeName: string,
    reason: string,
  ): CheckInResultVO {
    return new CheckInResultVO({
      isValid: false,
      ticketId,
      holderName,
      ticketTypeName,
      failureReason: reason,
      checkedInAt: null,
    });
  }

  protected validate(_props: CheckInResultProps): void {
    // All validation is done via static factories
  }
}
