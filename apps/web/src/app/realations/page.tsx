export default function RealationsPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-white p-8">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 16 }).map((_, idx) => (
          <div key={idx} className="h-24 w-24 rounded-md bg-purple-500" />
        ))}
      </div>
    </main>
  );
}