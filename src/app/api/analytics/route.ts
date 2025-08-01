

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
    const data = JSON.parse(fileContent) as AnalyticsDataPoint[];
    // Remove duplicates by creating a map
    const uniqueDataMap = new Map<string, AnalyticsDataPoint>();
    data.forEach(item => {
        uniqueDataMap.set(item.date, item);
    });
    return Array.from(uniqueDataMap.values());
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
    const existingAnalyticsData = await readAnalyticsData();
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 1. Create a clean map of the last 30 days with initial zeroed data
    const last30DaysMap = new Map<string, AnalyticsDataPoint>();
    const allDeviceNames = new Set(devices.map(d => d.name));

    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setUTCDate(today.getUTCDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const initialData: AnalyticsDataPoint = { date: dateString };
        allDeviceNames.forEach(name => initialData[name] = 0);
        last30DaysMap.set(dateString, initialData);
    }
    
    // 2. Populate the map with existing data
    existingAnalyticsData.forEach(d => {
        if (last30DaysMap.has(d.date)) {
            // Merge existing data, keeping the structure from the map
            const dayData = last30DaysMap.get(d.date)!;
            Object.keys(d).forEach(key => {
                if (key !== 'date') {
                    dayData[key] = d[key];
                }
            });
        }
    });
    
    // 3. Calculate today's duration and update the map
    const todayString = today.toISOString().split('T')[0];
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

    if(last30DaysMap.has(todayString)) {
       const todayData = last30DaysMap.get(todayString)!;
       last30DaysMap.set(todayString, { ...todayData, ...dailyDurations });
    }

    // 4. Convert map to array and sort
    const finalAnalyticsData = Array.from(last30DaysMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    await writeAnalyticsData(finalAnalyticsData);
    return NextResponse.json({ message: 'Dados de analytics atualizados com sucesso', data: finalAnalyticsData }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Erro ao atualizar dados de analytics', error: error.message }, { status: 500 });
  }
}
