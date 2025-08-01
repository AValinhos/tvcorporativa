
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises'

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.json');
const analyticsFilePath = path.join(process.cwd(), 'src', 'lib', 'analytics.json');
const exposureFilePath = path.join(process.cwd(), 'src', 'lib', 'exposure.json');

type BackupType = 'content' | 'visualization';

const readFileSafely = async (filePath: string, defaultData: any) => {
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return defaultData; // Retorna dado padrão se arquivo não existe
        }
        console.error(`Error reading or parsing file: ${filePath}`, error);
        throw new Error(`Falha ao ler o arquivo: ${path.basename(filePath)}`);
    }
};


// Exportar Backup
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as BackupType || 'content';
    let fileContent;
    let filename;

    if (type === 'content') {
        fileContent = await fs.readFile(dataFilePath, 'utf-8');
        filename = 'content-backup.json';
    } else if (type === 'visualization') {
        const analyticsData = await readFileSafely(analyticsFilePath, []);
        const exposureData = await readFileSafely(exposureFilePath, {});
        fileContent = JSON.stringify({ analyticsData, exposureData }, null, 2);
        filename = 'visualization-backup.json';
    } else {
        return NextResponse.json({ message: 'Tipo de backup inválido.' }, { status: 400 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    return new Response(fileContent, { headers });
  } catch (error: any) {
    console.error('Error reading data file for export:', error);
    return NextResponse.json({ message: `Erro ao exportar dados: ${error.message}` }, { status: 500 });
  }
}

// Importar Backup
export async function POST(req: NextRequest) {
    try {
        const data = await req.formData();
        const file: File | null = data.get('file') as unknown as File;
        const type = data.get('type') as BackupType || 'content';

        if (!file) {
            return NextResponse.json({ message: 'Nenhum arquivo enviado.' }, { status: 400 })
        }

        if (file.type !== 'application/json') {
             return NextResponse.json({ message: 'Tipo de arquivo inválido. Apenas .json é permitido.' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const fileContent = buffer.toString('utf-8');

        // Validar se o conteúdo é um JSON válido antes de salvar
        try {
            JSON.parse(fileContent);
        } catch (e) {
            return NextResponse.json({ message: 'Conteúdo do arquivo não é um JSON válido.' }, { status: 400 })
        }
        
        if (type === 'content') {
            await writeFile(dataFilePath, buffer);
        } else if (type === 'visualization') {
            const { analyticsData, exposureData } = JSON.parse(fileContent);
            if (!analyticsData || !exposureData) {
                return NextResponse.json({ message: 'Arquivo de backup de visualização inválido. Faltam chaves esperadas.' }, { status: 400 });
            }
            await writeFile(analyticsFilePath, JSON.stringify(analyticsData, null, 2));
            await writeFile(exposureFilePath, JSON.stringify(exposureData, null, 2));
        } else {
            return NextResponse.json({ message: 'Tipo de backup inválido.' }, { status: 400 });
        }
        
        return NextResponse.json({ message: 'Backup importado com sucesso!' }, { status: 200 })

    } catch (error) {
        console.error('Error importing data file:', error);
        return NextResponse.json({ message: 'Erro ao importar dados.' }, { status: 500 });
    }
}
