import { IsEmail } from 'class-validator';
import { IsUnlockPattern } from './is-unlock-pattern.decorator';

export class LoginDto {
  @IsEmail()
  email!: string;

  /**
   * The unlock pattern, canonicalized by the SPA to the cells it visited
   * (e.g. `"03678"`). It rides in `password` because that is precisely what it
   * is: `AuthService` bcrypt-compares the string without ever learning it came
   * from a grid, which keeps the credential seam generic.
   */
  @IsUnlockPattern()
  password!: string;
}
