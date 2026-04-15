---
name: api-docs-review
description: "**REVIEW SKILL** — Verify Swagger/OpenAPI documentation completeness on backend controllers and DTOs. USE FOR: checking @ApiTags, @ApiOperation, @ApiResponse, @ApiProperty on endpoints and DTOs; reviewing API docs before PR; auditing documentation gaps after adding new endpoints. DO NOT USE FOR: architecture boundary checks (use arch-review); frontend review; API contract design."
argument-hint: "Module name to review (e.g. 'events', 'users') or 'all' for every module"
---

# API Documentation Compliance Review

Verify that Tickr backend controllers and DTOs have complete Swagger/OpenAPI documentation, matching the rules enforced by the architecture tests in suite "📋 10. Documentation".

## When to Use

- After adding or modifying controller endpoints
- After creating or updating DTOs
- Before opening a PR that touches API surface
- As the follow-up step after **arch-review** (which handles structure and boundaries, then hands off here for documentation)

## Procedure

### 1. Identify Target Modules

If the user specifies a module name, review that module only. If "all" or no argument, review every module under `backend/src/modules/`.

### 2. Check Controller Class-Level Documentation

For every `*.controller.ts` in `modules/<name>/infrastructure/controllers/`:

- **MUST** have `@ApiTags('<TagName>')` decorator on the class
- Tag name must match one of the tags registered in `main.ts` DocumentBuilder:
  `Authentication`, `Users`, `Events`, `Tickets`, `Payments`, `Notifications`, `Analytics`
- **SHOULD** have `@ApiBearerAuth()` if the controller uses auth guards

### 3. Check Endpoint-Level Documentation

For every HTTP method decorator (`@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`) in each controller:

- **MUST** have `@ApiOperation({ summary: '...' })` — concise description of what the endpoint does
- **MUST** have at least one `@ApiResponse({ status: <code>, description: '...' })` for the success case
- **SHOULD** have `@ApiResponse` for common error cases (400, 401, 403, 404, 422)
- **SHOULD** have `@ApiBody({ type: <DtoClass> })` when accepting a request body
- **SHOULD** have `@ApiParam(...)` for path parameters with description and type
- **SHOULD** have `@ApiQuery(...)` for query parameters with description, type, required flag, and enum values where applicable

### 4. Check DTO Documentation

For every `*.dto.ts` in `modules/<name>/application/dtos/`:

- Required fields **MUST** have `@ApiProperty({ description: '...', example: '...' })`
- Optional fields **MUST** have `@ApiPropertyOptional({ description: '...', example: '...' })`
- Enum fields should include `enum: <EnumType>` in the decorator options
- Nested object fields should include `type: <NestedDtoClass>`

### 5. Verify Swagger Setup

Confirm `backend/src/main.ts` has:
- `DocumentBuilder` with title, description, version
- `.addTag(...)` for each module's tag name
- `.addBearerAuth()` for JWT authentication
- `SwaggerModule.setup('api/docs', ...)` to expose the docs endpoint

### 6. Report Findings

Produce a summary table:

| Check | Status | Details |
|---|---|---|
| @ApiTags on controllers | ✅/❌ | Controllers missing tags |
| @ApiOperation on endpoints | ✅/❌ | Endpoints missing operation docs |
| @ApiResponse on endpoints | ✅/❌ | Endpoints missing response docs |
| @ApiProperty on DTOs | ✅/❌ | DTO fields missing docs |
| Swagger setup in main.ts | ✅/❌ | Missing configuration |

For each ❌, list the specific file, class/method, and what decorator is missing.

## Reference

See [Swagger patterns](./references/swagger-patterns.md) for the complete decorator reference and examples from the codebase.
