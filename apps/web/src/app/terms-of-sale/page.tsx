import Link from "next/link";

export default function TermsOfSalePage() {
  return (
    <div className="min-h-screen w-full relative bg-white">
      <div className="w-full h-20 border-b border-black flex items-center justify-center">
        <Link href="/" className="text-2xl font-medium font-gloucester text-black hover:text-gray-600 transition-colors">
          The Reality Report
        </Link>
      </div>
      
      <div className="w-full max-w-4xl mx-auto px-4 pt-16">
        <h1 className="text-3xl font-gloucester mb-8">Terms of Sale</h1>
        <p className="font-hamburg text-gray-600">Terms of Sale content will be added here.</p>
      </div>
    </div>
  );
}
