FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js lessons.json ./
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "server.js"]
