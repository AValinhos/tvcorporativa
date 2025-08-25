
import DisplayClient from "@/components/DisplayClient";

export default function DisplayPage({ params }: { params: { id: string } }) {
  // O ID na rota agora é o ID do DISPOSITIVO, não da playlist.
  // O DisplayClient irá buscar o dispositivo, encontrar a playlist associada e exibir.
  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <DisplayClient deviceId={params.id} />
    </div>
  );
}
