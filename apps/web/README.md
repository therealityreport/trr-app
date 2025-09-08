This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Firebase Emulator (Auth + Firestore)

- Enable: set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` (see `.env.example`). Optionally set `NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID=demo-trr` so the Emulator UI shows your data.
- Start emulators: from repo root run `npm run emulators`. This uses `firebase.json` ports (Auth `9099`, Firestore `8080`) and persists data in `.emulator-data/`.
- Start the app against emulators: from `apps/web/`, run `npm run dev:emu`. Alternatively, export the env var inline: `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true npm run dev`.
- Toggle back to prod: set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false` (or use the default `dev` script) and restart the dev server.

Notes
- The client SDK auto-connects to emulators when the flag is on; no production data is read or written.
- Keeping a distinct emulator project ID (e.g., `demo-trr`) helps the Emulator UI display the same namespace your client uses.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
