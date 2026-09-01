export type EventCheckInAuthorizationSource =
  | 'OWNER'
  | 'ADMIN'
  | 'ASSIGNMENT';

export interface EventCheckInAccessDecision {
  readonly eventId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly authorizationSource: EventCheckInAuthorizationSource;
  readonly assignmentId: string | null;
  readonly canCheckIn: boolean;
  readonly canViewBasicStats: boolean;
}

export interface EventCheckInAccessListItem {
  readonly eventId: string;
  readonly title: string;
  readonly status: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly authorizationSource: EventCheckInAuthorizationSource;
  readonly assignmentId: string | null;
}