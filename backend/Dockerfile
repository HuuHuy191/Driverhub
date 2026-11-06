FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "status=$(node scripts/docker-init-db.js) || exit 1; npm run migration:run && { if [ \"$status\" = created ]; then npm run seed:config; fi; } && npm run seed:admin && exec npm run start:prod"]
