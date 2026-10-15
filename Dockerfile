FROM node:22-alpine

WORKDIR /app

# Instalar dependencias aprovechando la caché de capas
COPY package*.json ./
RUN npm ci

# Copiar el código fuente y compilar el frontend con Vite (genera /app/dist)
COPY . .
RUN npm run build

# Crear carpeta dedicada para persistir SQLite fuera del código estático
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data

EXPOSE 3001

CMD ["node", "server/index.js"]
