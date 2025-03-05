import { Matches } from 'class-validator';

import { PASSWORD_REGEX } from '../../application';

export const PasswordStrengthDecorator = () => {
  return Matches(PASSWORD_REGEX, {
    message: 'Password must include uppercase, lowercase, number, and special character.'
  });
};
