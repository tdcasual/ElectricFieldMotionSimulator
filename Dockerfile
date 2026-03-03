# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build:frontend

FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
