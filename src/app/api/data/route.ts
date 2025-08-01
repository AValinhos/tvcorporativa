

import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.json');
const analyticsFilePath = path.join(process.cwd(), 'src', 'lib', 'analytics.json');
const exposureFilePath = path.join(process.cwd(), 'src', 'lib', 'exposure.json');

async function readData() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { users: [], mediaItems: [], playlists: [] };
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
        
        // Use await to ensure this call completes before the main response is sent.
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
        // This action triggers an analytics update and then fetches all data
        await updateAnalytics(req);
        // Re-read data files after potential update
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
       // Remove the media item itself
      data.mediaItems = data.mediaItems.filter((item: any) => item.id !== body.payload.id);
      // Remove the media item from any playlists it's in
      data.playlists.forEach((playlist: any) => {
        const initialLength = playlist.items.length;
        playlist.items = playlist.items.filter((item: any) => item.mediaId !== body.payload.id);
        if(playlist.items.length !== initialLength) analyticsShouldUpdate = true;
      });
    } else if (body.action === 'BULK_DELETE_MEDIA') {
        const idsToDelete = body.payload.ids;
        // Remove the media items
        data.mediaItems = data.mediaItems.filter((item: any) => !idsToDelete.includes(item.id));
        // Remove the media items from any playlists they're in
        data.playlists.forEach((playlist: any) => {
            const initialLength = playlist.items.length;
            playlist.items = playlist.items.filter((item: any) => !idsToDelete.includes(item.mediaId));
            if(playlist.items.length !== initialLength) analyticsShouldUpdate = true;
        });
    } else if (body.action === 'UPDATE_PLAYLISTS') {
      data.playlists = body.payload;
      analyticsShouldUpdate = true;
    } else if (body.action === 'CREATE_PLAYLIST') {
      const newId = data.playlists.length > 0
          ? String(Math.max(...data.playlists.map((p: any) => Number(p.id) || 0)) + 1)
          : '1';
      const newPlaylist = {
          ...body.payload,
          id: newId
      }
      data.playlists.push(newPlaylist);
      analyticsShouldUpdate = true;
    } else if (body.action === 'UPDATE_PLAYLIST') {
        data.playlists = data.playlists.map((p:any) => p.id === body.payload.id ? body.payload.updates : p);
        analyticsShouldUpdate = true;
    } else if (body.action === 'DELETE_PLAYLIST') {
        data.playlists = data.playlists.filter((p:any) => p.id !== body.payload.id);
        analyticsShouldUpdate = true;
    } else {
        return NextResponse.json({ message: 'Ação inválida' }, { status: 400 });
    }

    await writeData(data);
    
    // If a playlist-related action occurred, trigger the analytics update.
    if (analyticsShouldUpdate) {
        await updateAnalytics(req);
    }

    return NextResponse.json({ message: 'Dados atualizados com sucesso', data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Erro ao processar a ação', error: error.message }, { status: 500 });
  }
}
