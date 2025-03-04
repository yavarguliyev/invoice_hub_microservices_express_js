import { Matches } from 'class-validator';

import { PASSWORD_REGEX } from '../../application/helpers/regex-patterns.helper';

export const PasswordStrengthDecorator = () => {
  return Matches(PASSWORD_REGEX, {
    message: 'Password must include uppercase, lowercase, number, and special character.'
  });
};
