# Folosim o imagine Node.js mai nouă pentru compatibilitate cu dependențele moderne
FROM node:16-alpine AS build

# Directorul de lucru
WORKDIR /app

# Copierea fișierelor package pentru instalarea dependențelor
COPY package.json ./

# Instalarea dependențelor
RUN npm install

# Copierea codului sursă al aplicației
COPY . .

# Construirea aplicației pentru producție
RUN npm run build

# Etapa de producție cu Nginx
FROM nginx:alpine

# Copierea configurației Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copierea fișierelor build din etapa anterioară
COPY --from=build /app/build /usr/share/nginx/html

# Expunerea portului 90
EXPOSE 90

# Configurare Nginx pentru a asculta pe portul 90
RUN sed -i 's/listen\s*80;/listen 90;/g' /etc/nginx/conf.d/default.conf

# Comanda de pornire Nginx
CMD ["nginx", "-g", "daemon off;"]