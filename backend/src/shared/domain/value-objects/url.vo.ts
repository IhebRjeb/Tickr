import { ValueObject } from '../value-object.base';

interface UrlProps {
  value: string;
}

export class InvalidUrlException extends Error {
  constructor(url: string) {
    super(`Invalid URL format: ${url}`);
    this.name = 'InvalidUrlException';
  }
}

/**
 * URL Value Object
 * 
 * Validates and manages URLs
 */
export class Url extends ValueObject<UrlProps> {
  private static readonly URL_REGEX =
    /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

  get value(): string {
    return this.props.value;
  }

  get protocol(): string {
    return new globalThis.URL(this.props.value).protocol.replace(':', '');
  }

  get hostname(): string {
    return new globalThis.URL(this.props.value).hostname;
  }

  get pathname(): string {
    return new globalThis.URL(this.props.value).pathname;
  }

  get isHttps(): boolean {
    return this.protocol === 'https';
  }

  static create(url: string): Url {
    return new Url({ value: url.trim() });
  }

  protected validate(props: UrlProps): void {
    if (!props.value || !Url.URL_REGEX.test(props.value)) {
      throw new InvalidUrlException(props.value);
    }
  }
}
