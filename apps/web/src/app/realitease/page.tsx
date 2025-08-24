"use client";
import { useEffect, useRef, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

type Card = { id: string; text: string; answer: boolean };

const CARDS: Card[] = [
  { id: "1", text: "This event happened BEFORE Bravo.", answer: true },
  { id: "2", text: "This event happened AFTER Bravo.", answer: false },
];

export default function RealiteasePage() {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [userUid, setUserUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const savedRef = useRef(false);
  const card = CARDS[i];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  const choose = (guess: boolean) => {
    if (!card) return;
    if (guess === card.answer) setScore((s) => s + 1);
    setI((s) => s + 1);
  };

  useEffect(() => {
    // When we've gone past the last card, persist the result once
    const finished = i >= CARDS.length;
    if (!finished || savedRef.current) return;

    (async () => {
      try {
        // Require authentication to save; if not signed in, skip saving instead of throwing
        if (!userUid) {
          console.warn("Not signed in; skipping Firestore save.");
          savedRef.current = true;
          return;
        }
        await addDoc(collection(db, "realitease_results"), {
          uid: userUid,
          score,
          total: CARDS.length,
          createdAt: serverTimestamp(),
        });
        savedRef.current = true; // prevent duplicate writes
      } catch (err) {
        console.error("Failed to save REALITEASE result:", err);
      }
    })();
  }, [i, score, userUid]);

  if (!card) {
    return (
      <main className="min-h-screen grid place-items-center p-8">
        <div className="text-center">
          <h1 className="font-serif text-4xl">REALITEASE — Results</h1>
          <p className="mt-2">Score: {score} / {CARDS.length}</p>
          {!userUid && (
            <p className="mt-2 text-sm text-amber-600">Sign in on the <Link className="underline" href="/test-auth">Auth page</Link> to save your results.</p>
          )}
          <p className="text-sm text-gray-500">Your result is saved locally and to the cloud (if signed in).</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="font-serif text-4xl">REALITEASE</h1>
        <p className="text-lg">{card.text}</p>
        <div className="flex gap-4 justify-center">
          <button className="px-4 py-2 border rounded" onClick={() => choose(true)}>Before</button>
          <button className="px-4 py-2 border rounded" onClick={() => choose(false)}>After</button>
        </div>
        <p className="text-sm text-gray-500">Card {i + 1} / {CARDS.length}</p>
      </div>
    </main>
  );
}