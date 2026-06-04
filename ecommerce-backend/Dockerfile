FROM node:20-alpine

WORKDIR /app

# Cài dependencies trước (cache layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
