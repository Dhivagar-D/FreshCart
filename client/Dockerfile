
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --include=dev && test -x node_modules/.bin/vite

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
