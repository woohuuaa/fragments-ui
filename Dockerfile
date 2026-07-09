# syntax=docker/dockerfile:1
# Stage 1: Install dependencies and build the production static assets
FROM node:24-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0 AS build

WORKDIR /app

ARG VITE_API_URL
ARG VITE_AWS_COGNITO_POOL_ID
ARG VITE_AWS_COGNITO_CLIENT_ID
ARG VITE_OAUTH_SIGN_IN_REDIRECT_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AWS_COGNITO_POOL_ID=$VITE_AWS_COGNITO_POOL_ID
ENV VITE_AWS_COGNITO_CLIENT_ID=$VITE_AWS_COGNITO_CLIENT_ID
ENV VITE_OAUTH_SIGN_IN_REDIRECT_URL=$VITE_OAUTH_SIGN_IN_REDIRECT_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Copy only the built assets into a lightweight Nginx image
FROM nginx:1.27-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]