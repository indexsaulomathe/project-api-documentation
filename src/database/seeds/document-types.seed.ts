import { DataSource } from 'typeorm';
import { DocumentType } from '../../document-types/entities/document-type.entity';

const defaultDocumentTypes = [
  { name: 'CPF', description: 'Cadastro de Pessoa Física', isRequired: true },
  { name: 'RG', description: 'Registro Geral', isRequired: true },
  {
    name: 'ASO',
    description: 'Atestado de Saúde Ocupacional',
    isRequired: true,
  },
  {
    name: 'Certidão de Nascimento',
    description: 'Certidão de nascimento ou casamento',
    isRequired: false,
  },
  {
    name: 'Comprovante de Residência',
    description: 'Comprovante de endereço recente',
    isRequired: true,
  },
  {
    name: 'CTPS',
    description: 'Carteira de Trabalho e Previdência Social',
    isRequired: true,
  },
  {
    name: 'PIS/PASEP',
    description:
      'Programa de Integração Social / Programa de Formação do Patrimônio do Servidor Público',
    isRequired: true,
  },
];

export async function seedDocumentTypes(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(DocumentType);

  for (const data of defaultDocumentTypes) {
    const existing = await repository.findOne({ where: { name: data.name } });
    if (!existing) {
      const documentType = repository.create(data);
      await repository.save(documentType);
      console.log(`Seeded document type: ${data.name}`);
    } else {
      console.log(`Skipped (already exists): ${data.name}`);
    }
  }
}
