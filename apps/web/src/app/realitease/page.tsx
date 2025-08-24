"use client";

import { useEffect, useRef, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Card = { id: string; text: string; answer: boolean };

const CARDS: Card[] = [
  { id: "1", text: "This event happened BEFORE Bravo.", answer: true },
  { id: "2", text: "This event happened AFTER Bravo.", answer: false },
];

export default function RealiteasePage() {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [userUid, setUserUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [locked, setLocked] = useState(false); // prevent super-fast double clicks
  const savedRef = useRef(false);
  const card = CARDS[i];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  const choose = (guess: boolean) => {
    if (!card || locked) return;
    setLocked(true);
    if (guess === card.answer) setScore((s) => s + 1);
    // small delay so users see their click register; optional
    setTimeout(() => {
      setI((s) => s + 1);
      setLocked(false);
    }, 100);
  };

  // Persist result when finished (once)
  useEffect(() => {
    const finished = i >= CARDS.length;
    if (!finished || savedRef.current) return;

    (async () => {
      try {
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
        savedRef.current = true;
      } catch (err) {
        console.error("Failed to save REALITEASE result:", err);
      }
    })();
  }, [i, score, userUid]);

  const reset = () => {
    setI(0);
    setScore(0);
    savedRef.current = false;
  };

  if (!card) {
    return (
      <main className="min-h-screen grid place-items-center p-8">
        <div className="text-center space-y-3">
          <h1 className="font-serif text-4xl">REALITEASE — Results</h1>
          <p className="mt-2">Score: {score} / {CARDS.length}</p>
          {!userUid && (
            <p className="text-sm text-amber-600">
              Sign in on the <a className="underline" href="/test-auth">Auth page</a> to save your results.
            </p>
          )}
          <button
            className="mt-3 rounded border px-4 py-2"
            onClick={reset}
          >
            Play again
          </button>
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
          <button
            className="px-4 py-2 border rounded disabled:opacity-50"
            onClick={() => choose(true)}
            disabled={locked}
          >
            Before
          </button>
          <button
            className="px-4 py-2 border rounded disabled:opacity-50"
            onClick={() => choose(false)}
            disabled={locked}
          >
            After
          </button>
        </div>
        <p className="text-sm text-gray-500">Card {i + 1} / {CARDS.length}</p>
      </div>
    </main>
  );
}