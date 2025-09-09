import Link from "next/link";

export default function TermsOfSalePage() {
  return (
    <div className="w-[1440px] h-[900px] relative bg-white mx-auto">
      <div className="w-[1440px] h-20 left-0 top-[0.50px] absolute border-b border-black">
        <div className="w-96 h-20 left-[524px] top-0 absolute flex items-center justify-center">
          <Link href="/" className="text-2xl font-medium font-['Gloucester_OS_MT_Std'] text-black hover:text-gray-600 transition-colors">
            The Reality Report
          </Link>
        </div>
      </div>
      
      <div className="w-[800px] left-[320px] top-[120px] absolute">
        <h1 className="text-3xl font-['Gloucester_OS_MT_Std'] mb-8">Terms of Sale</h1>
        <p className="font-['HamburgSerial'] text-gray-600">Terms of Sale content will be added here.</p>
      </div>
    </div>
  );
}
