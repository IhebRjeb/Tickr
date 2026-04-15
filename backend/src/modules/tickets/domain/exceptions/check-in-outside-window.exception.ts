import { DomainException } from '@shared/domain/domain-exception.base';

export class CheckInOutsideWindowException extends DomainException {
  constructor(message: string) {
    super(message, 'CHECK_IN_OUTSIDE_WINDOW');
  }

  static tooEarly(
    eventStartDate: Date,
    windowOpensBefore: number,
  ): CheckInOutsideWindowException {
    return new CheckInOutsideWindowException(
      `Check-in window opens ${windowOpensBefore} hour(s) before event start at ${eventStartDate.toISOString()}`,
    );
  }

  static tooLate(eventEndDate: Date): CheckInOutsideWindowException {
    return new CheckInOutsideWindowException(
      `Check-in window closed: event ended at ${eventEndDate.toISOString()}`,
    );
  }

  static eventNotStarted(eventId: string): CheckInOutsideWindowException {
    return new CheckInOutsideWindowException(
      `Check-in is not yet available for event ${eventId}`,
    );
  }
}
