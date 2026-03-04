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

## Question Generation

### Agent Skill (if you want to create new skill)

1. use claude-code or Antigravity
2. input ```use `generate-quiz` skill. [your instructions]```

### Command Line (if level exist, and you want to add more quiz, MORE QUICKLY)

```bash
npx tsx scripts/generate-quiz.ts --rollup {rollup} --count {The number of questions you need to generate}
```

## Convert 3MF to GLB

Converts `.3mf` 3D model files to binary `.glb` (glTF) using Three.js `ThreeMFLoader` + `GLTFExporter` with jsdom shims for Node.js compatibility. No extra packages required — uses the already-installed `three` and `jsdom` dependencies.

```bash
# Single file → default output: data/glb/<name>.glb
npx tsx scripts/convert-3mf-to-glb.ts model.3mf

# Single file with explicit output path
npx tsx scripts/convert-3mf-to-glb.ts model.3mf --output public/models/model.glb
npx tsx scripts/convert-3mf-to-glb.ts model.3mf -o public/models/model.glb

# Batch: convert all .3mf files in a directory (recursive)
npx tsx scripts/convert-3mf-to-glb.ts --dir ./assets/3mf
npx tsx scripts/convert-3mf-to-glb.ts -d ./assets/3mf --out-dir ./public/models

# npm script shortcut
npm run convert-3mf -- model.3mf
npm run convert-3mf -- --dir ./assets/3mf --out-dir ./public/models
```

**Options:**
- `--output, -o` — Output `.glb` path (single file only)
- `--dir, -d` — Directory to scan recursively for `.3mf` files
- `--out-dir` — Output directory for batch conversion (default: `data/glb/`)
- `--help, -h` — Show usage

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
