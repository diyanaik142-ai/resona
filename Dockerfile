FROM node:22-slim
ENV NODE_ENV=production
ENV SERVE_FRONTEND=true
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY shared ./shared
COPY dist ./dist
EXPOSE 8080
CMD ["node", "server/index.js"]
