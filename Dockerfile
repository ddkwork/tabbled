FROM node:16.14 as build

WORKDIR /app
COPY . /app

RUN npm install
RUN npm run build

FROM nginx:1.16.0-alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.template.conf /etc/nginx/nginx.template.conf
EXPOSE 80

WORKDIR /usr/share/nginx/html

CMD ["/bin/sh",  "-c",  "envsubst < /etc/nginx/nginx.template.conf > /etc/nginx/nginx.conf && envsubst < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js && exec nginx -g 'daemon off;'"]
