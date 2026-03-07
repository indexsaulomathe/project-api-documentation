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
  token?: string,
): Promise<string> {
  const req = request(app.getHttpServer() as http.Server)
    .post('/api/v1/employees')
    .send({ ...EMPLOYEE_PAYLOAD, ...payload });
  if (token) req.set('Authorization', `Bearer ${token}`);
  const res = await req;
  return (res.body as ApiResponse).data.id;
}

export async function createDocumentType(
  app: INestApplication,
  payload?: Partial<typeof DOCUMENT_TYPE_PAYLOAD>,
  token?: string,
): Promise<string> {
  const req = request(app.getHttpServer() as http.Server)
    .post('/api/v1/document-types')
    .send({ ...DOCUMENT_TYPE_PAYLOAD, ...payload });
  if (token) req.set('Authorization', `Bearer ${token}`);
  const res = await req;
  return (res.body as ApiResponse).data.id;
}

export async function linkDocumentType(
  app: INestApplication,
  employeeId: string,
  documentTypeId: string,
  token?: string,
): Promise<void> {
  const req = request(app.getHttpServer() as http.Server)
    .post(`/api/v1/employees/${employeeId}/document-types`)
    .send({ documentTypeId });
  if (token) req.set('Authorization', `Bearer ${token}`);
  await req;
}
