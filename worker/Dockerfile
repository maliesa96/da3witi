FROM node:20-slim AS build

WORKDIR /app/worker

# Repo-root build context:
# - copy worker files from worker/
# - copy Prisma schema from prisma/
COPY worker/package.json ./
COPY worker/package-lock.json ./

# Install deps
RUN npm install

# Copy source
COPY worker/tsconfig.json ./
COPY worker/src ./src
COPY prisma /app/prisma

# Symlink so prisma generate finds node_modules relative to schema location
RUN ln -s /app/worker/node_modules /app/node_modules

# Prisma requires OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Build JS (runs prisma generate + tsc)
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app/worker

ENV NODE_ENV=production

COPY --from=build /app/worker/package.json ./package.json
COPY --from=build /app/worker/node_modules ./node_modules
COPY --from=build /app/worker/dist ./dist

CMD ["npm", "start"]

