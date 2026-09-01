export const EVENT_CHECK_IN_ACCESS_PORT = Symbol(
  'EVENT_CHECK_IN_ACCESS_PORT',
);

export type EventCheckInAuthorizationSource =
  | 'OWNER'
  | 'ADMIN'
  | 'ASSIGNMENT';

export type EventCheckInAccessDecision = {
  readonly eventId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly authorizationSource: EventCheckInAuthorizationSource;
  readonly assignmentId: string | null;
  readonly canCheckIn: boolean;
  readonly canViewBasicStats: boolean;
};

export interface EventCheckInAccessPort {
  resolve(
    eventId: string,
    actorId: string,
  ): Promise<EventCheckInAccessDecision | null>;
}