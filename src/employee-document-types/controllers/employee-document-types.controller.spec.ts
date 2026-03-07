import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeeDocumentTypesController } from './employee-document-types.controller';
import { EmployeeDocumentTypesService } from '../services/employee-document-types.service';
import { CreateLinkDto } from '../dto/create-link.dto';

const mockLink = {
  id: 'link-uuid',
  employeeId: 'emp-uuid',
  documentTypeId: 'dt-uuid',
  createdAt: new Date(),
  deletedAt: null,
};

const mockService = {
  link: jest.fn(),
  unlink: jest.fn(),
  findByEmployee: jest.fn(),
};

describe('EmployeeDocumentTypesController', () => {
  let controller: EmployeeDocumentTypesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeDocumentTypesController],
      providers: [
        { provide: EmployeeDocumentTypesService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<EmployeeDocumentTypesController>(
      EmployeeDocumentTypesController,
    );
  });

  describe('POST /employees/:employeeId/document-types', () => {
    it('should call service.link() and return the created link', async () => {
      const dto: CreateLinkDto = { documentTypeId: 'dt-uuid' };
      mockService.link.mockResolvedValue(mockLink);

      const result = await controller.link('emp-uuid', dto);

      expect(mockService.link).toHaveBeenCalledWith('emp-uuid', 'dt-uuid');
      expect(result).toEqual(mockLink);
    });

    it('should propagate NotFoundException when employee not found', async () => {
      mockService.link.mockRejectedValue(new NotFoundException());

      await expect(
        controller.link('non-existent', { documentTypeId: 'dt-uuid' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate NotFoundException when document type not found', async () => {
      mockService.link.mockRejectedValue(new NotFoundException());

      await expect(
        controller.link('emp-uuid', { documentTypeId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException when link already exists', async () => {
      mockService.link.mockRejectedValue(new ConflictException());

      await expect(
        controller.link('emp-uuid', { documentTypeId: 'dt-uuid' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('DELETE /employees/:employeeId/document-types/:documentTypeId', () => {
    it('should call service.unlink() and return success message', async () => {
      mockService.unlink.mockResolvedValue({
        message: 'Link removed successfully',
      });

      const result = await controller.unlink('emp-uuid', 'dt-uuid');

      expect(mockService.unlink).toHaveBeenCalledWith('emp-uuid', 'dt-uuid');
      expect(result).toEqual({ message: 'Link removed successfully' });
    });

    it('should propagate NotFoundException when link not found', async () => {
      mockService.unlink.mockRejectedValue(new NotFoundException());

      await expect(
        controller.unlink('emp-uuid', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /employees/:employeeId/document-types', () => {
    it('should call service.findByEmployee() and return list of links', async () => {
      mockService.findByEmployee.mockResolvedValue([mockLink]);

      const result = await controller.findByEmployee('emp-uuid');

      expect(mockService.findByEmployee).toHaveBeenCalledWith('emp-uuid');
      expect(result).toEqual([mockLink]);
    });

    it('should propagate NotFoundException when employee not found', async () => {
      mockService.findByEmployee.mockRejectedValue(new NotFoundException());

      await expect(controller.findByEmployee('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
