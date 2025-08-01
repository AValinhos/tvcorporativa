

import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.json');
const analyticsFilePath = path.join(process.cwd(), 'src', 'lib', 'analytics.json');
const exposureFilePath = path.join(process.cwd(), 'src', 'lib', 'exposure.json');

async function readData() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    // Initialize devices and deviceIds on playlists if they don't exist
    if (!data.devices) {
      data.devices = [];
    }
    data.playlists.forEach((p: any) => {
        if (!p.deviceIds) {
            p.deviceIds = [];
        }
    });
    return data;
  } catch (error) {
    console.error('Error reading data file:', error);
    return { users: [], mediaItems: [], playlists: [], devices: [] };
  }
}

async function writeData(data: any) {
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing data file:', error);
    throw new Error('Could not write to data file.');
  }
}

async function updateAnalytics(req: NextRequest) {
    try {
        const host = req.headers.get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        
        await fetch(`${protocol}://${host}/api/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error("Failed to trigger analytics update:", error);
    }
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let data = await readData();
    let analyticsShouldUpdate = false;

    if (body.action === 'GET_DASHBOARD_DATA') {
        await updateAnalytics(req);
        const [allData, analyticsData, exposureData] = await Promise.all([
            readData(),
            fs.readFile(analyticsFilePath, 'utf-8').then(JSON.parse).catch(() => []),
            fs.readFile(exposureFilePath, 'utf-8').then(JSON.parse).catch(() => ({}))
        ]);

        return NextResponse.json({ 
            ...allData,
            analyticsData, 
            exposureData
        }, { status: 200 });
    }
    
    // --- Other actions ---
    if (body.action === 'CREATE_MEDIA') {
      data.mediaItems.push(body.payload);
    } else if (body.action === 'UPDATE_MEDIA') {
      data.mediaItems = data.mediaItems.map((item: any) =>
        item.id === body.payload.id ? { ...item, ...body.payload.updates } : item
      );
    } else if (body.action === 'DELETE_MEDIA') {
      data.mediaItems = data.mediaItems.filter((item: any) => item.id !== body.payload.id);
      data.playlists.forEach((playlist: any) => {
        const initialLength = playlist.items.length;
        playlist.items = playlist.items.filter((item: any) => item.mediaId !== body.payload.id);
        if(playlist.items.length !== initialLength) analyticsShouldUpdate = true;
      });
    } else if (body.action === 'BULK_DELETE_MEDIA') {
        const idsToDelete = body.payload.ids;
        data.mediaItems = data.mediaItems.filter((item: any) => !idsToDelete.includes(item.id));
        data.playlists.forEach((playlist: any) => {
            const initialLength = playlist.items.length;
            playlist.items = playlist.items.filter((item: any) => !idsToDelete.includes(item.mediaId));
            if(playlist.items.length !== initialLength) analyticsShouldUpdate = true;
        });
    } else if (body.action === 'CREATE_PLAYLIST') {
      const newId = data.playlists.length > 0
          ? String(Math.max(...data.playlists.map((p: any) => Number(p.id) || 0)) + 1)
          : '1';
      const newPlaylist = { ...body.payload, id: newId, deviceIds: [] }
      data.playlists.push(newPlaylist);
    } else if (body.action === 'UPDATE_PLAYLIST') {
        const { id, updates } = body.payload;
        data.playlists = data.playlists.map((p:any) => {
            if (p.id === id) {
                // Ensure deviceIds are merged, not overwritten, if not in updates
                const finalUpdates = { ...updates };
                if (updates.deviceIds === undefined) {
                    finalUpdates.deviceIds = p.deviceIds || [];
                }
                return { ...p, ...finalUpdates };
            }
             // Remove the device from any other playlist that might have it
            if (updates.deviceIds && updates.deviceIds.length > 0) {
              const deviceIdToAssign = updates.deviceIds[updates.deviceIds.length - 1];
              if (p.deviceIds && p.deviceIds.includes(deviceIdToAssign)) {
                  p.deviceIds = p.deviceIds.filter((dId: string) => dId !== deviceIdToAssign);
              }
            }
            return p;
        });
        analyticsShouldUpdate = true;
    } else if (body.action === 'DELETE_PLAYLIST') {
        const playlistToDelete = data.playlists.find((p:any) => p.id === body.payload.id);
        if (playlistToDelete && playlistToDelete.deviceIds && playlistToDelete.deviceIds.length > 0) {
            analyticsShouldUpdate = true;
        }
        data.playlists = data.playlists.filter((p:any) => p.id !== body.payload.id);
    } else if (body.action === 'CREATE_DEVICE') {
        const newId = data.devices.length > 0
          ? String(Math.max(...data.devices.map((d: any) => Number(d.id) || 0)) + 1)
          : '1';
        const newDevice = { ...body.payload, id: newId };
        data.devices.push(newDevice);
    } else if (body.action === 'UPDATE_DEVICE') {
        const device = data.devices.find((d: any) => d.id === body.payload.id);
        if (device && device.playlistId !== body.payload.updates.playlistId) {
            analyticsShouldUpdate = true;
        }
        data.devices = data.devices.map((d: any) => d.id === body.payload.id ? { ...d, ...body.payload.updates } : d);
    } else if (body.action === 'DELETE_DEVICE') {
        const device = data.devices.find((d:any) => d.id === body.payload.id);
        if (device) analyticsShouldUpdate = true;
        data.devices = data.devices.filter((d: any) => d.id !== body.payload.id);
        // Also remove deviceId from any playlists that might have it
        data.playlists.forEach((p: any) => {
          if (p.deviceIds && p.deviceIds.includes(body.payload.id)) {
            p.deviceIds = p.deviceIds.filter((id: string) => id !== body.payload.id);
          }
        });
    } else {
        return NextResponse.json({ message: 'Ação inválida' }, { status: 400 });
    }

    await writeData(data);
    
    if (analyticsShouldUpdate) {
        await updateAnalytics(req);
    }

    return NextResponse.json({ message: 'Dados atualizados com sucesso', data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Erro ao processar a ação', error: error.message }, { status: 500 });
  }
}
