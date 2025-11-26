import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';

import { PaginatedResponseDto } from '../dtos/pagination.dto';

/**
 * ApiPaginatedResponse Decorator
 * 
 * Documents paginated responses in Swagger
 * 
 * Usage:
 * @ApiPaginatedResponse(EventDto)
 * @Get()
 * async getEvents() { ... }
 */
export const ApiPaginatedResponse = <TModel extends Type>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(PaginatedResponseDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};
