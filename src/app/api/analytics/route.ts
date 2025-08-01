
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const analyticsFilePath = path.join(process.cwd(), 'src', 'lib', 'analytics.json');
const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.json');

interface AnalyticsDataPoint {
  date: string;
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
    return JSON.parse(fileContent);
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
    const uniqueDataMap = new Map<string, AnalyticsDataPoint>();
    data.forEach(item => {
        uniqueDataMap.set(item.date, item);
    });
    const uniqueData = Array.from(uniqueDataMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    await fs.writeFile(analyticsFilePath, JSON.stringify(uniqueData, null, 2), 'utf-8');
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
        return { playlists: [], devices: [] };
    }
}


export async function GET() {
  const data = await readAnalyticsData();
  return NextResponse.json(data);
}


export async function POST(req: NextRequest) {
  try {
    const allData = await readDataFile();
    const playlists: Playlist[] = allData.playlists || [];
    const devices: Device[] = allData.devices || [];
    
    let analyticsData = await readAnalyticsData();
    
    // Use UTC date to avoid timezone issues
    const today = new Date();
    const todayString = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString().split('T')[0];

    const dailyDurations: { [key: string]: any } = { date: todayString };
     devices.forEach(device => {
        const playlist = playlists.find(p => p.id === device.playlistId);
        if(playlist) {
            const totalDurationSeconds = playlist.items.reduce((acc, item) => acc + item.duration, 0);
            dailyDurations[device.name] = Math.ceil(totalDurationSeconds / 60); 
        } else {
             dailyDurations[device.name] = 0;
        }
    });

    const todayIndex = analyticsData.findIndex(d => d.date === todayString);
    if (todayIndex > -1) {
        analyticsData[todayIndex] = { ...analyticsData[todayIndex], ...dailyDurations };
    } else {
        analyticsData.push(dailyDurations);
    }
    
    await writeAnalyticsData(analyticsData);
    return NextResponse.json({ message: 'Dados de analytics atualizados com sucesso', data: analyticsData }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Erro ao atualizar dados de analytics', error: error.message }, { status: 500 });
  }
}
