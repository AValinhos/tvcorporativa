

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
  deviceIds?: string[];
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
    const analyticsData = await readAnalyticsData();

    // --- Start: Logic to ensure last 30 days are present ---
    const today = new Date();
    const last30Days: { [date: string]: AnalyticsDataPoint } = {};
    const allDeviceNames = new Set(devices.map(d => d.name));

    // Initialize the last 30 days with empty data points
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const initialData: AnalyticsDataPoint = { date: dateString };
        allDeviceNames.forEach(name => initialData[name] = 0);
        last30Days[dateString] = initialData;
    }

    // Populate with existing data
    analyticsData.forEach(d => {
        if (last30Days[d.date]) {
            last30Days[d.date] = { ...last30Days[d.date], ...d };
        }
    });

    // --- End: Logic to ensure last 30 days are present ---

    const todayString = today.toISOString().split('T')[0];

    // Calculate today's durations
    const dailyDurations: { [key: string]: any } = { date: todayString };
    let activityToday = false;
    devices.forEach(device => {
        const playlist = playlists.find(p => p.id === device.playlistId);
        if(playlist) {
            const totalDurationSeconds = playlist.items.reduce((acc, item) => acc + item.duration, 0);
            dailyDurations[device.name] = Math.ceil(totalDurationSeconds / 60); 
            if(totalDurationSeconds > 0) activityToday = true;
        } else {
             dailyDurations[device.name] = 0;
        }
    });

    // Update today's data point in our 30-day map
    if(last30Days[todayString]) {
       last30Days[todayString] = { ...last30Days[todayString], ...dailyDurations };
    }


    // Convert map back to an array and sort by date
    const finalAnalyticsData = Object.values(last30Days).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Ensure we don't have more than 30 days if the logic above adds extra
    if (finalAnalyticsData.length > 30) {
        finalAnalyticsData.splice(0, finalAnalyticsData.length - 30);
    }


    await writeAnalyticsData(finalAnalyticsData);
    return NextResponse.json({ message: 'Dados de analytics atualizados com sucesso', data: finalAnalyticsData }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Erro ao atualizar dados de analytics', error: error.message }, { status: 500 });
  }
}

