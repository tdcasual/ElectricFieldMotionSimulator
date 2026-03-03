# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build:frontend

FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
