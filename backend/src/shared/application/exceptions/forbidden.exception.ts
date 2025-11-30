import { ApplicationException } from './application.exception';

export class ForbiddenException extends ApplicationException {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN');
  }
}
