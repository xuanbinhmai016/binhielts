FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js auth.js lessons.json ./
RUN mkdir -p /app/data && chown node:node /app/data
ENV DATA_FILE=/app/data/users.json
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "server.js"]
