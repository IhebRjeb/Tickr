import { ApplicationException } from './application.exception';

export class NotFoundException extends ApplicationException {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id '${id}' not found`, 'NOT_FOUND');
  }
}
