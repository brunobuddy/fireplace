import { ValidationOptions, registerDecorator } from 'class-validator';
import {
  MAX_PATTERN_LENGTH,
  MIN_PATTERN_LENGTH,
  isValidPattern,
} from '../pattern';

/**
 * Rejects anything that is not a walk a finger could trace on the 3x3 grid.
 *
 * This buys no secrecy on its own — a wrong pattern fails the bcrypt compare
 * anyway — but it throws garbage out before we spend ~100ms hashing it, which
 * matters on an endpoint deliberately exposed to unauthenticated traffic.
 */
export function IsUnlockPattern(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isUnlockPattern',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isValidPattern(value);
        },
        defaultMessage(): string {
          return `${String(propertyName)} must be an unlock pattern of ${MIN_PATTERN_LENGTH} to ${MAX_PATTERN_LENGTH} connected cells`;
        },
      },
    });
  };
}
