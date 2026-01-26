FROM node:20-slim AS build

WORKDIR /app

COPY package.json ./

# Install deps
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build JS
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD ["npm", "start"]

