export const EVENT_STAFF_USER_DIRECTORY = Symbol(
  'EVENT_STAFF_USER_DIRECTORY',
);

export interface EventStaffUserInterface {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: 'ADMIN' | 'ORGANIZER' | 'PARTICIPANT';
  readonly isActive: boolean;
  readonly emailVerified: boolean;
}

export interface EventStaffUserDirectoryPort {
  getUserById(userId: string): Promise<EventStaffUserInterface | null>;

  getUserByEmail(email: string): Promise<EventStaffUserInterface | null>;

  getUsersByIds(userIds: string[]): Promise<EventStaffUserInterface[]>;
}