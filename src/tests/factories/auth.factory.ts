import { RegisterDto } from "../../modules/auth/dto/register.dto";

export const createRegisterDto = (overrides: Partial<RegisterDto> = {}): RegisterDto => {
  const dto = new RegisterDto();
  dto.email = "test@example.com";
  dto.fullName = "Default User";
  dto.password = "Password123!";

  return Object.assign(dto, overrides);
};