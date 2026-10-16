import { auth } from "@/lib/firebase";

export async function syncGameCompletion(uid: string, game: "bravodle" | "realitease", puzzleDate: string, guesses: unknown[]): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("Sign in as the game owner to sync your result.");
  const guessIds = guesses.map((guess) => {
    const row = guess as { guessInfo?: Record<string, unknown>; guessedInfo?: Record<string, unknown> };
    const info = row.guessInfo ?? row.guessedInfo ?? {};
    return info.castId ?? info.CastID ?? info.imdbCastId ?? info.imdbID;
  });
  const response = await fetch("/api/games/completion", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ game, puzzleDate, guessIds }),
  });
  if (!response.ok) throw new Error("Your game is saved, but result syncing failed. Reload the game to retry.");
}
