"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [verificationCode, setVerificationCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(!!email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    
    setPending(true);
    setError(null);
    
    try {
      // For now, we'll just simulate the verification process
      // In a real app, you'd verify the code with your backend
      if (verificationCode.length === 6) {
        // Simulate success
        router.push("/auth/register");
      } else {
        setError("Please enter a valid 6-digit code");
      }
    } catch (err) {
      setError("Invalid verification code. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleRequestNewCode = async () => {
    if (!email || pending) return;
    
    setPending(true);
    setError(null);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setCodeSent(true);
    } catch (err) {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="w-[1440px] h-[900px] relative bg-white mx-auto">
      {/* Header */}
      <div className="w-[1440px] h-20 left-0 top-[0.50px] absolute border-b border-black">
        <div className="w-96 h-20 left-[524px] top-0 absolute flex items-center justify-center">
          <button 
            onClick={() => router.push("/")}
            className="text-2xl font-medium font-['Gloucester_OS_MT_Std'] text-black hover:text-gray-600 transition-colors cursor-pointer"
          >
            The Reality Report
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-[546px] left-[447px] top-[152.50px] absolute bg-white">
        {/* Title */}
        <h2 className="w-full text-center text-black text-3xl font-medium font-['Gloucester_OS_MT_Std'] leading-10 mb-6">
          Check your email to reset your password
        </h2>

        {/* Subtitle */}
        <h3 className="w-full text-center text-black text-lg font-normal font-['HamburgSerial'] leading-6 mb-8">
          Enter the code we sent to <span className="font-medium">{email}</span> to update your login.
          <br />
          This code expires in 10 minutes.
        </h3>

        {error && (
          <div className="w-full border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Verification Code Field */}
          <div className="w-full mb-6">
            <label htmlFor="verification-code" className="block text-black text-sm font-normal font-['HamburgSerial'] leading-tight mb-3">
              Verification code
            </label>
            <div className="w-full h-11 rounded-[3px] border border-black">
              <input
                id="verification-code"
                name="verification-code"
                type="text"
                maxLength={6}
                pattern="[0-9]*"
                className="w-full h-full bg-white rounded-[3px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black border-0 text-black text-center text-lg tracking-widest"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                disabled={pending}
                placeholder="000000"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="w-full h-11 mb-6 bg-neutral-900 rounded-[3px] border border-black">
            <button
              type="submit"
              className="w-full h-full bg-transparent text-center justify-center text-white text-base font-normal font-['HamburgSerial'] leading-9 disabled:opacity-60"
              disabled={pending || verificationCode.length !== 6}
            >
              {pending ? "Verifying…" : "Submit"}
            </button>
          </div>
        </form>

        {/* Resend Code Section */}
        <div className="w-full text-center">
          <p className="text-black text-sm font-normal font-['HamburgSerial'] leading-tight">
            Didn't receive a code? Check your spam folder
            <span className="block mt-2">
              or{" "}
              <button
                type="button"
                onClick={handleRequestNewCode}
                disabled={pending}
                className="text-black underline hover:no-underline disabled:opacity-60"
              >
                request a new one.
              </button>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
