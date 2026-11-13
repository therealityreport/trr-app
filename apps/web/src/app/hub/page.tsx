import ClientAuthGuard from "@/components/ClientAuthGuard";
import GameGallery from "@/components/GameGallery";

export default function Page() {
  return (
    <ClientAuthGuard requireComplete={true}>
      <GameGallery />
    </ClientAuthGuard>
  );
}
