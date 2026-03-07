import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsCpfValid', async: false })
export class IsCpfValidConstraint implements ValidatorConstraintInterface {
  validate(cpf: string): boolean {
    if (!cpf || !/^\d{11}$/.test(cpf)) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let remainder = sum % 11;
    const firstDigit = remainder < 2 ? 0 : 11 - remainder;
    if (firstDigit !== parseInt(cpf[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    remainder = sum % 11;
    const secondDigit = remainder < 2 ? 0 : 11 - remainder;
    return secondDigit === parseInt(cpf[10]);
  }

  defaultMessage(): string {
    return 'CPF is invalid';
  }
}

export function IsCpfValid(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsCpfValidConstraint,
    });
  };
}
