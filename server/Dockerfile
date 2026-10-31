
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && test -d node_modules/express
COPY src ./src

EXPOSE 5000

CMD ["npm", "start"]
