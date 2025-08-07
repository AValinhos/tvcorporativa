
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const analyticsFilePath = path.join(process.cwd(), 'src', 'lib', 'analytics.json');
const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.json');

interface AnalyticsDataPoint {
  date: string;
  time: string;
  [key: string]: any;
}

interface Playlist {
  id: string;
  name: string;
  items: { mediaId: string; duration: number }[];
}

interface Device {
  id: string;
  name: string;
  playlistId: string;
}

async function readAnalyticsData(): Promise<AnalyticsDataPoint[]> {
  try {
    const fileContent = await fs.readFile(analyticsFilePath, 'utf-8');
    const data = JSON.parse(fileContent) as any[];
    // Garante que todos os registros tenham um campo 'time'
    return data.map(d => ({
        ...d,
        time: d.time || '00:00:00'
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error('Error reading analytics file:', error);
    return [];
  }
}

async function writeAnalyticsData(data: AnalyticsDataPoint[]) {
  try {
    // Ordena os dados por data e hora antes de salvar
    data.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
    });
    await fs.writeFile(analyticsFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing analytics file:', error);
    throw new Error('Could not write to analytics file.');
  }
}

async function readDataFile() {
    try {
        const fileContent = await fs.readFile(dataFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading data file:', error);
        return { playlists: [], devices: [], settings: { enableAnalytics: true } };
    }
}


export async function GET() {
  const data = await readAnalyticsData();
  return NextResponse.json(data);
}


export async function POST(req: NextRequest) {
  try {
    const allData = await readDataFile();
    
    // Respeita a configuração de analytics
    if (!allData.settings?.enableAnalytics) {
        return NextResponse.json({ message: 'A coleta de analytics está desabilitada.' }, { status: 200 });
    }

    const playlists: Playlist[] = allData.playlists || [];
    const devices: Device[] = allData.devices || [];
    
    let analyticsData = await readAnalyticsData();
    
    const now = new Date();
    const dateString = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('/').reverse().join('-');
    const timeString = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });

    const newDatapoint: AnalyticsDataPoint = { date: dateString, time: timeString };

     devices.forEach(device => {
        const playlist = playlists.find(p => p.id === device.playlistId);
        if(playlist) {
            const totalDurationSeconds = playlist.items.reduce((acc, item) => acc + item.duration, 0);
            newDatapoint[device.name] = Math.ceil(totalDurationSeconds / 60); 
        } else {
             newDatapoint[device.name] = 0;
        }
    });

    analyticsData.push(newDatapoint);
    
    await writeAnalyticsData(analyticsData);
    return NextResponse.json({ message: 'Dados de analytics atualizados com sucesso', data: newDatapoint }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Erro ao atualizar dados de analytics', error: error.message }, { status: 500 });
  }
}
