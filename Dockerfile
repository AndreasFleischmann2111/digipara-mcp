FROM node:20-alpine

WORKDIR /app

# Dependencies installieren
COPY package*.json ./
RUN npm ci --omit=dev

# Source bauen
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm install -D typescript && npm run build && npm uninstall -D typescript

# Port freigeben
EXPOSE 8080

# HTTP-Server starten
CMD ["node", "dist/index-http.js"]
