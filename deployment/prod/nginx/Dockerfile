FROM nginx:alpine

RUN apk add --no-cache netcat-openbsd curl

RUN curl -sSL https://github.com/vishnubob/wait-for-it/releases/download/v2.5.0/wait-for-it.sh \
    -o /usr/local/bin/wait-for-it && chmod +x /usr/local/bin/wait-for-it

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
