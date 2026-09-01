// Events Module - Application Layer - DTOs

// ============================================
// Create Event
// ============================================
export {
  CreateEventDto,
  CreateEventLocationDto,
  CreateEventResponseDto,
} from './create-event.dto';

// ============================================
// Update Event
// ============================================
export {
  UpdateEventDto,
  UpdateEventLocationDto,
} from './update-event.dto';

export { SetEventCommissionOverrideDto } from './set-event-commission.dto';
export {
  AssignEventCheckInStaffDto,
  EventCheckInStaffAssignmentDto,
  PaginatedEventCheckInStaffAssignmentsDto,
  EventCheckInAccessListItemDto,
  PaginatedEventCheckInAccessDto,
} from './event-check-in-staff.dto';

// ============================================
// Ticket Types
// ============================================
export {
  AddTicketTypeDto,
  AddTicketTypeResponseDto,
} from './add-ticket-type.dto';

export { UpdateTicketTypeDto } from './update-ticket-type.dto';

// ============================================
// Cancel Event
// ============================================
export { CancelEventDto } from './cancel-event.dto';

// ============================================
// Response DTOs (Query Results)
// ============================================
export {
  TicketTypeDto,
  TicketTypeSummaryDto,
} from './ticket-type.dto';

export {
  EventDto,
  EventLocationDto,
  EventOrganizerDto,
} from './event.dto';

export {
  EventListDto,
  EventListLocationDto,
  EventListOrganizerDto,
  PaginatedEventListDto,
} from './event-list.dto';

// ============================================
// Filter & Pagination DTOs
// ============================================
export {
  EventFilterDto,
  OrganizerEventFilterDto,
  PaginationDto,
  SearchDto,
} from './event-filter.dto';
