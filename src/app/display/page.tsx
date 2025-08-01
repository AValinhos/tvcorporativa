

import Link from 'next/link';

export default function DisplayRootPage() {

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <h1 className="text-4xl font-bold mb-4">Página de Exibição</h1>
      <p className="text-lg mb-8">
        Para ver o conteúdo, acesse a URL de um dispositivo específico.
      </p>
      <p>
        Exemplo: <Link href="/display/1" className="text-blue-600 hover:underline">/display/1</Link>
      </p>
       <p className="mt-8 text-sm text-gray-600">
        Você pode criar e gerenciar dispositivos na página de <Link href="/settings" className="text-blue-600 hover:underline">Configurações</Link>.
      </p>
    </div>
  );
}
