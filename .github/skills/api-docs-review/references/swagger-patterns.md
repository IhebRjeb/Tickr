# Swagger Decorator Patterns

Reference for Swagger/OpenAPI decorators used in Tickr controllers and DTOs.

## Controller Class Level

```typescript
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Events')      // Required — matches tag in main.ts
@ApiBearerAuth()         // When controller uses auth guards
@Controller('events')
export class EventsController { }
```

### Registered Tags (main.ts)

| Tag | Module |
|---|---|
| `Authentication` | users |
| `Users` | users |
| `Events` | events |
| `Tickets` | tickets (planned) |
| `Payments` | payments (planned) |
| `Notifications` | notifications (planned) |
| `Analytics` | analytics (planned) |

## Endpoint Level

```typescript
import { ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

@Post()
@ApiOperation({ summary: 'Create a new event' })
@ApiBody({ type: CreateEventDto })
@ApiResponse({ status: 201, description: 'Event created successfully' })
@ApiResponse({ status: 400, description: 'Invalid input data' })
@ApiResponse({ status: 401, description: 'Not authenticated' })
@ApiResponse({ status: 403, description: 'Not authorized' })
async create(@Body() dto: CreateEventDto) { }

@Get(':id')
@ApiOperation({ summary: 'Get event by ID' })
@ApiParam({ name: 'id', description: 'Event UUID' })
@ApiResponse({ status: 200, description: 'Event found', type: EventResponseDto })
@ApiResponse({ status: 404, description: 'Event not found' })
async findOne(@Param('id') id: string) { }

@Get()
@ApiOperation({ summary: 'Search events' })
@ApiQuery({ name: 'category', required: false, enum: EventCategory })
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiResponse({ status: 200, description: 'Paginated event list', type: PaginatedEventListDto })
async search(@Query() filters: EventFilterDto) { }
```

## DTO Level

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({
    description: 'Event title',
    example: 'Jazz Festival Tunis 2026',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Event category',
    enum: EventCategory,
    example: EventCategory.MUSIC,
  })
  category?: EventCategory;

  @ApiProperty({
    description: 'Event location',
    type: EventLocationDto,
  })
  location!: EventLocationDto;
}
```

### Rules

| Field Type | Decorator | Required Options |
|---|---|---|
| Required primitive | `@ApiProperty` | `description`, `example` |
| Optional primitive | `@ApiPropertyOptional` | `description`, `example` |
| Enum | `@ApiProperty` / `@ApiPropertyOptional` | `enum: <Type>` |
| Nested object | `@ApiProperty` | `type: <DtoClass>` |
| Array | `@ApiProperty` | `type: [<DtoClass>]` or `isArray: true` |

## Docs Endpoint

Swagger UI is served at `http://localhost:3000/api/docs` with:
- `persistAuthorization: true`
- `tagsSorter: 'alpha'`
- `operationsSorter: 'alpha'`
