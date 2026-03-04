import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as http from 'http';

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

interface ApiResponse {
  data: { id: string };
}

export async function createEmployee(
  app: INestApplication,
  payload?: Partial<typeof EMPLOYEE_PAYLOAD>,
): Promise<string> {
  const res = await request(app.getHttpServer() as http.Server)
    .post('/api/v1/employees')
    .send({ ...EMPLOYEE_PAYLOAD, ...payload });
  return (res.body as ApiResponse).data.id;
}

export async function createDocumentType(
  app: INestApplication,
  payload?: Partial<typeof DOCUMENT_TYPE_PAYLOAD>,
): Promise<string> {
  const res = await request(app.getHttpServer() as http.Server)
    .post('/api/v1/document-types')
    .send({ ...DOCUMENT_TYPE_PAYLOAD, ...payload });
  return (res.body as ApiResponse).data.id;
}

export async function linkDocumentType(
  app: INestApplication,
  employeeId: string,
  documentTypeId: string,
): Promise<void> {
  await request(app.getHttpServer() as http.Server)
    .post(`/api/v1/employees/${employeeId}/document-types`)
    .send({ documentTypeId });
}
