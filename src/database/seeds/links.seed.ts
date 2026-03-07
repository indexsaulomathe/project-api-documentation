import { DataSource, IsNull } from 'typeorm';
import { EmployeeDocumentType } from '../../employee-document-types/entities/employee-document-type.entity';
import {
  Document,
  DocumentStatus,
} from '../../documents/entities/document.entity';
import { DocumentType } from '../../document-types/entities/document-type.entity';

// Which document type names each employee (by cpf) gets linked to
const LINKS_BY_CPF: Record<string, string[]> = {
  '52998224725': ['CPF', 'RG', 'CTPS'], // João
  '27548438923': ['CPF', 'ASO', 'Comprovante de Residência'], // Maria
  '12345678909': ['CPF', 'RG', 'PIS/PASEP'], // Carlos
  '11144477735': ['CPF', 'RG', 'ASO', 'CTPS'], // Ana
  '98765432100': ['CPF', 'CTPS', 'PIS/PASEP'], // Pedro
  '34578916642': ['CPF', 'RG', 'Comprovante de Residência'], // Fernanda
};

export async function seedLinks(
  dataSource: DataSource,
  employeeIdsByCpf: Record<string, string>,
): Promise<void> {
  const edtRepo = dataSource.getRepository(EmployeeDocumentType);
  const docRepo = dataSource.getRepository(Document);
  const dtRepo = dataSource.getRepository(DocumentType);

  // Build a map of document type name → id
  const allDocTypes = await dtRepo.find({ where: { deletedAt: IsNull() } });
  const docTypeIdByName: Record<string, string> = {};
  for (const dt of allDocTypes) {
    docTypeIdByName[dt.name] = dt.id;
  }

  for (const [cpf, docTypeNames] of Object.entries(LINKS_BY_CPF)) {
    const employeeId = employeeIdsByCpf[cpf];
    if (!employeeId) continue;

    for (const dtName of docTypeNames) {
      const documentTypeId = docTypeIdByName[dtName];
      if (!documentTypeId) {
        console.log(`  ! DocType not found: ${dtName} — skipping`);
        continue;
      }

      const existingLink = await edtRepo.findOne({
        where: { employeeId, documentTypeId, deletedAt: IsNull() },
      });

      if (!existingLink) {
        await edtRepo.save(edtRepo.create({ employeeId, documentTypeId }));
        await docRepo.save(
          docRepo.create({
            employeeId,
            documentTypeId,
            status: DocumentStatus.PENDING,
            version: 1,
            isActive: true,
          }),
        );
        console.log(`  + Link: employee ${cpf} ↔ ${dtName}`);
      } else {
        console.log(`  ~ Link (exists): employee ${cpf} ↔ ${dtName}`);
      }
    }
  }
}
