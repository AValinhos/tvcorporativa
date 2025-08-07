

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
    // Initialize parts of the data if they don't exist
    if (!data.devices) data.devices = [];
    if (!data.playlists) data.playlists = [];
    if (!data.mediaItems) data.mediaItems = [];
    if (!data.users) data.users = [];
    if (!data.settings) data.settings = { enableAnalytics: true };
    if (data.settings.enableAnalytics === undefined) data.settings.enableAnalytics = true;
    
    data.playlists.forEach((p: any) => {
        if (!p.deviceIds) {
            p.deviceIds = [];
        }
    });
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // If file doesn't exist, create it with a default structure
      const defaultData = { 
          users: [{user: "admin", password: "password"}], 
          mediaItems: [], 
          playlists: [], 
          devices: [],
          settings: { enableAnalytics: true } 
      };
      await writeData(defaultData);
      return defaultData;
    }
    console.error('Error reading data file:', error);
    // Return a default structure in case of other errors
    return { users: [], mediaItems: [], playlists: [], devices: [], settings: { enableAnalytics: true } };
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
        // We don't want to expose passwords to the client
        const clientSafeUsers = data.users.map((u: any) => ({ user: u.user }));

        const [analyticsData, exposureData] = await Promise.all([
            fs.readFile(analyticsFilePath, 'utf-8').then(JSON.parse).catch(() => []),
            fs.readFile(exposureFilePath, 'utf-8').then(JSON.parse).catch(() => ({}))
        ]);

        return NextResponse.json({ 
            ...data,
            users: clientSafeUsers,
            analyticsData, 
            exposureData
        }, { status: 200 });
    }
    
    if (body.action === 'CLEAR_VISUALIZATION_DATA') {
        await fs.writeFile(analyticsFilePath, '[]', 'utf-8');
        await fs.writeFile(exposureFilePath, '{}', 'utf-8');
        return NextResponse.json({ message: 'Dados de visualização limpos com sucesso.' }, { status: 200 });
    }
     // --- Settings Actions ---
    if (body.action === 'UPDATE_SETTINGS') {
        data.settings = { ...data.settings, ...body.payload };
    }
    // --- User Actions ---
    else if (body.action === 'CREATE_USER') {
        const { user, password } = body.payload;
        if (data.users.find((u: any) => u.user === user)) {
             return NextResponse.json({ message: 'Usuário já existe.' }, { status: 409 });
        }
        data.users.push({ user, password });
    } else if (body.action === 'UPDATE_USER') {
        const { originalUser, user, password } = body.payload;
        const userIndex = data.users.findIndex((u: any) => u.user === originalUser);
        if (userIndex === -1) {
            return NextResponse.json({ message: 'Usuário original não encontrado.' }, { status: 404 });
        }
        if (user !== originalUser && data.users.some((u: any) => u.user === user)) {
            return NextResponse.json({ message: 'Novo nome de usuário já está em uso.' }, { status: 409 });
        }
        data.users[userIndex].user = user;
        // Only update password if a new one is provided
        if (password) {
            data.users[userIndex].password = password;
        }
    } else if (body.action === 'DELETE_USER') {
        const { user } = body.payload;
        if (data.users.length <= 1) {
             return NextResponse.json({ message: 'Não é possível excluir o único usuário.' }, { status: 400 });
        }
        data.users = data.users.filter((u: any) => u.user !== user);
    }
    // --- Media Actions ---
    else if (body.action === 'CREATE_MEDIA') {
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
    } 
    // --- Playlist Actions ---
    else if (body.action === 'CREATE_PLAYLIST') {
      const newId = data.playlists.length > 0
          ? String(Math.max(...data.playlists.map((p: any) => Number(p.id) || 0)) + 1)
          : '1';
      const newPlaylist = { ...body.payload, id: newId, deviceIds: [] }
      data.playlists.push(newPlaylist);
    } else if (body.action === 'UPDATE_PLAYLIST') {
      const { id, updates } = body.payload;
      data.playlists = data.playlists.map((p: any) => {
        if (p.id === id) {
          analyticsShouldUpdate = true;
          return { ...p, ...updates };
        }
        return p;
      });
    } else if (body.action === 'DELETE_PLAYLIST') {
        const playlistToDelete = data.playlists.find((p:any) => p.id === body.payload.id);
        if (playlistToDelete && playlistToDelete.deviceIds && playlistToDelete.deviceIds.length > 0) {
            analyticsShouldUpdate = true;
        }
        data.playlists = data.playlists.filter((p:any) => p.id !== body.payload.id);
    } 
    // --- Device Actions ---
    else if (body.action === 'CREATE_DEVICE') {
        const newId = data.devices.length > 0
          ? String(Math.max(...data.devices.map((d: any) => Number(d.id) || 0)) + 1)
          : '1';
        const newDevice = { ...body.payload, id: newId };
        data.devices.push(newDevice);
        analyticsShouldUpdate = true;
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
    
    if (analyticsShouldUpdate && data.settings.enableAnalytics) {
        await updateAnalytics(req);
    }

    // Don't send passwords back to the client
    const clientSafeData = { ...data, users: data.users.map((u:any) => ({user: u.user}))};
    return NextResponse.json({ message: 'Dados atualizados com sucesso', data: clientSafeData }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Erro ao processar a ação', error: error.message }, { status: 500 });
  }
}

    