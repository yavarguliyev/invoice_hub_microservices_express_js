import { IsEmail, IsString, Length } from 'class-validator';

export class SigninArgs {
  @Length(8, 128)
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
