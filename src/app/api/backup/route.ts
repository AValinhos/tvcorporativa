
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises'


const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.json');

// Exportar Backup
export async function GET() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', 'attachment; filename="data.json"');
    return new Response(fileContent, { headers });
  } catch (error) {
    console.error('Error reading data file for export:', error);
    return NextResponse.json({ message: 'Erro ao exportar dados.' }, { status: 500 });
  }
}

// Importar Backup
export async function POST(req: NextRequest) {
    try {
        const data = await req.formData()
        const file: File | null = data.get('file') as unknown as File

        if (!file) {
            return NextResponse.json({ message: 'Nenhum arquivo enviado.' }, { status: 400 })
        }

        if (file.type !== 'application/json') {
             return NextResponse.json({ message: 'Tipo de arquivo inválido. Apenas .json é permitido.' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Validar se o conteúdo é um JSON válido antes de salvar
        try {
            JSON.parse(buffer.toString('utf-8'));
        } catch (e) {
            return NextResponse.json({ message: 'Conteúdo do arquivo não é um JSON válido.' }, { status: 400 })
        }

        // Escreve o novo arquivo
        await writeFile(dataFilePath, buffer)
        
        return NextResponse.json({ message: 'Backup importado com sucesso!' }, { status: 200 })

    } catch (error) {
        console.error('Error importing data file:', error);
        return NextResponse.json({ message: 'Erro ao importar dados.' }, { status: 500 });
    }
}
