# Geo-Drops Updated

Geo-Drops is a geo-location awards and collectibles platform built using [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Check out the main website at https://www.geo-drops.com for more information about the brand.

This is the frontend only for the application. The backend is written in NodeJS and can be found at the following URL. 

https://github.com/vomosev/geodrops-vercel

Contact victor@ega-tech.co for further information about this repository and its function, as direct access is restricted. 

## Environment Variables

```
NEXT_PUBLIC_MAPS_API_KEY=<from_google>
NEXT_PUBLIC_GEO_URL=https://app.geo-drops.com
```

## Getting Started With Development

This is solely for testing on your local laptop and not for production.

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

## Live Deployment

The preferred deployment platform is Vercel. Note that Vercel does not allow the use of package-lock.json, so delete it before pushing code to GitHub or add it to .gitignore.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

04/04/2026

This was added in /geodrops-vercel to cater for streaming charts

```
npm install recharts react-is
```