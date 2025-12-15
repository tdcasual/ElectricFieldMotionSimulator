# syntax=docker/dockerfile:1

FROM nginx:alpine

COPY . /usr/share/nginx/html

EXPOSE 80
