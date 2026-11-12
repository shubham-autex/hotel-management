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

## Environment

Create a `.env.local` in the project root with:

```
DATABASE_URL=postgres://USER:PASS@localhost:5432/hotel_admin
JWT_SECRET=replace-with-long-random-string
SEED_TOKEN=replace-with-one-time-token
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123
```

Tables are created automatically the first time the app connects. PostgreSQL 14 or newer is required.

## Docker

`docker compose up --build` starts Postgres 16 and the app at [http://localhost:3000](http://localhost:3000).

The database is `hotel_admin`, user `hotel`, password `hotel`. From the host:

```
DATABASE_URL=postgres://hotel:hotel@localhost:5432/hotel_admin
```

To run only the database and use `npm run dev` on the host:

```bash
docker compose up db
```

Override `JWT_SECRET`, `SEED_TOKEN`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the environment before `docker compose up` when you do not want the development defaults.

## Auth
- Email/password login at `/login` calls `/api/auth/login`.
- Protected routes under `/dashboard` via middleware.

## Seeding
Run once to create admin user:
```bash
curl -X POST -H "x-seed-token: $SEED_TOKEN" http://localhost:3000/api/seed
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
