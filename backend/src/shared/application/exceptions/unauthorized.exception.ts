import { ApplicationException } from './application.exception';

export class UnauthorizedException extends ApplicationException {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED');
  }
}
