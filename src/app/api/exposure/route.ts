
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const exposureFilePath = path.join(process.cwd(), 'src', 'lib', 'exposure.json');
const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.json');

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
    const body = await req.json();
    const { mediaId, deviceId } = body;
    const exposureData = await readExposureData();

    // Se um mediaId específico for enviado (ex: troca de item no carrossel), incrementa apenas ele.
    if (mediaId) {
        exposureData[mediaId] = (exposureData[mediaId] || 0) + 1;
    }

    // Se um deviceId for enviado (ex: carregamento da tela), incrementa todos os itens da playlist associada.
    if (deviceId) {
        const dataFileContent = await fs.readFile(dataFilePath, 'utf-8');
        const allData = JSON.parse(dataFileContent);
        const device = allData.devices.find((d: any) => d.id === deviceId);
        
        if (device && device.playlistId) {
            const playlist = allData.playlists.find((p: any) => p.id === device.playlistId);
            if (playlist && playlist.items) {
                playlist.items.forEach((item: any) => {
                    exposureData[item.mediaId] = (exposureData[item.mediaId] || 0) + 1;
                });
            }
        }
    }


    await writeExposureData(exposureData);
    return NextResponse.json({ message: 'Dados de exposição atualizados com sucesso', data: exposureData }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Erro ao atualizar dados de exposição', error: error.message }, { status: 500 });
  }
}

export async function GET() {
    const data = await readExposureData();
    return NextResponse.json(data);
}
