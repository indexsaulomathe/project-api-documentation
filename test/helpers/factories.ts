import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const EMPLOYEE_PAYLOAD = {
  name: 'John Doe',
  email: 'john@company.com',
  cpf: '52998224725',
  department: 'Engineering',
};

export const DOCUMENT_TYPE_PAYLOAD = {
  name: 'CPF',
  description: 'Cadastro de Pessoa Física',
  isRequired: true,
};

export async function createEmployee(
  app: INestApplication,
  payload = EMPLOYEE_PAYLOAD,
): Promise<string> {
  const { body } = await request(app.getHttpServer())
    .post('/api/v1/employees')
    .send(payload);
  return body.data.id;
}

export async function createDocumentType(
  app: INestApplication,
  payload = DOCUMENT_TYPE_PAYLOAD,
): Promise<string> {
  const { body } = await request(app.getHttpServer())
    .post('/api/v1/document-types')
    .send(payload);
  return body.data.id;
}

export async function linkDocumentType(
  app: INestApplication,
  employeeId: string,
  documentTypeId: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post(`/api/v1/employees/${employeeId}/document-types`)
    .send({ documentTypeId });
}
