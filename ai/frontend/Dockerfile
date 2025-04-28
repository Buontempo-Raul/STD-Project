# Folosim o imagine Node.js pentru build
FROM node:16-alpine AS build

# Instalăm dependențe suplimentare necesare pentru build
RUN apk add --no-cache python3 make g++

# Directorul de lucru
WORKDIR /app

# Copierea fișierelor package pentru instalarea dependențelor
COPY package.json ./

# Instalarea dependențelor cu o încercare de recuperare în caz de eșec
RUN npm install || (rm -rf node_modules && npm cache clean --force && npm install)

# Copierea codului sursă al aplicației
COPY . .

# Construirea aplicației pentru producție
RUN npm run build || (cat /root/.npm/_logs/*-debug.log && false)

# Etapa de producție cu Nginx
FROM nginx:alpine

# Copierea configurației Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copierea fișierelor build din etapa anterioară
COPY --from=build /app/build /usr/share/nginx/html

# Expunerea portului 91
EXPOSE 91

# Configurare Nginx pentru a asculta pe portul 91
RUN sed -i 's/listen\s*80;/listen 91;/g' /etc/nginx/conf.d/default.conf

# Comanda de pornire Nginx
CMD ["nginx", "-g", "daemon off;"]