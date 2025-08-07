
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const exposureFilePath = path.join(process.cwd(), 'src', 'lib', 'exposure.json');
const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.json');


async function readDataFile() {
    try {
        const fileContent = await fs.readFile(dataFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading data file:', error);
        return { settings: { enableAnalytics: true } };
    }
}

async function readExposureData(): Promise<{ [key: string]: number }> {
  try {
    const fileContent = await fs.readFile(exposureFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    console.error('Error reading exposure file:', error);
    return {};
  }
}

async function writeExposureData(data: { [key: string]: number }) {
  try {
    await fs.writeFile(exposureFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing exposure file:', error);
    throw new Error('Could not write to exposure file.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await readDataFile();
    if (!data.settings?.enableAnalytics) {
      return NextResponse.json({ message: 'A coleta de exposição está desabilitada.' }, { status: 200 });
    }

    const body = await req.json();
    const { mediaId } = body;
    const exposureData = await readExposureData();

    if (mediaId) {
        exposureData[mediaId] = (exposureData[mediaId] || 0) + 1;
        await writeExposureData(exposureData);
        return NextResponse.json({ message: 'Dados de exposição atualizados com sucesso', data: exposureData }, { status: 200 });
    }

    return NextResponse.json({ message: 'Nenhuma ação de exposição realizada. mediaId é obrigatório.' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ message: 'Erro ao atualizar dados de exposição', error: error.message }, { status: 500 });
  }
}

export async function GET() {
    const data = await readExposureData();
    return NextResponse.json(data);
}
