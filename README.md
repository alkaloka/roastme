# ROAST ME Miniapp

Miniapp Farcaster untuk roasting lucu dan pedas dengan bahan 10 cast terbaru pengguna. Dibangun dengan Next.js 14, OpenAI, dan API Neynar.

## Fitur
- Deteksi otomatis username Farcaster via Miniapp Bridge (fallback ke input manual).
- Tombol `ROAST ME` untuk roast awal + indikator tingkat kepedasan.
- Tombol `Roast again` meningkatkan intensitas roast secara bertahap.
- Tombol `Post me` mencoba membuka composer Farcaster / fallback copy ke clipboard.
- Manifest miniapp disiapkan di `public/.well-known/farcaster.json`.

## Persiapan
1. Duplikasi `.env.example` menjadi `.env.local` dan isi nilai sebenarnya:
   ```bash
   OPENAI_API_KEY=sk-...
   NEYNAR_API_KEY=na_...
   NEYNAR_API_BASE=https://api.neynar.com
   ```
   > **Catatan:** Jangan commit file `.env.local`.
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Jalankan pengembangan lokal:
   ```bash
   npm run dev
   ```
4. Deploy ke hosting (Vercel direkomendasikan), lalu update URL akhir di `public/.well-known/farcaster.json`.

## Integrasi Miniapp
- Pastikan URL miniapp menghosting file `/.well-known/farcaster.json` sesuai domain publik.
- Warpcast / Farcaster host akan mengirim konteks viewer melalui `postMessage` atau objek `window.farcaster`. Skrip `lib/miniapp-bridge.ts` mendukung kedua jalur:
  - Menangkap event `warpcast-miniapp:context` / `farcaster.miniapp.context`.
  - Memanggil `window.farcaster.getViewer()` atau `getSession()` jika tersedia.
- Jika host belum memberi konteks, pengguna bisa mengetik username manual.

## Posting ke Farcaster
`tryPublishCast` akan:
1. Memanggil `window.farcaster.publishCast` atau `openCastComposer` bila tersedia.
2. Jika gagal, fallback ke `navigator.clipboard` dan memberi instruksi manual.

## API Roast
- Endpoint: `POST /api/roast`
- Body: `{ "username": "blaugrana", "intensity": 1 }`
- Response: `{ "roast": "...", "castsFetched": 10 }`

Roasting dibuat oleh `lib/roast.ts` menggunakan `gpt-4.1-mini` dengan guardrail supaya tidak menyentuh identitas dilindungi.

## Catatan Lain
- Logo yang dipakai berada di `public/logo.svg`. Ganti dengan aset original bila tersedia.
- Intensitas maksimal saat ini 5 level. Mudah disesuaikan via array `intensityLabel`.
- Untuk produksi, pertimbangkan menambahkan rate limiting dan logging terstruktur.

