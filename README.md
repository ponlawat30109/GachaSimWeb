# Astral Archive

Next.js web frontend for the GachaSim project.

## Features

- Single and 10× gacha pulls
- Inventory and pull history
- Responsive interface

## Setup

Start [GachaSimServer](https://github.com/ponlawat30109/GachaSimServer), then run:

```bash
npm install
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001).

The API defaults to `http://localhost:3000`. To change it, create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```
