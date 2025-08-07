
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.json');

async function readUsers() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return data.users || [];
  } catch (error) {
    console.error('Error reading data file for login:', error);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, password } = await req.json();
    const users = await readUsers();

    const foundUser = users.find((u: any) => u.user === user && u.password === password);

    if (foundUser) {
      return NextResponse.json({ success: true, message: 'Login bem-sucedido.' }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'Usuário ou senha inválidos.' }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Erro no servidor.', error: error.message }, { status: 500 });
  }
}
