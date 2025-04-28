# Folosim doar Node.js pentru backend, fără Apache
FROM node:16-alpine

# Instalăm unelte pentru debugging
RUN apk add --no-cache curl

# Directorul de lucru
WORKDIR /app

# Copierea package.json
COPY package.json ./

# Instalarea dependențelor
RUN npm install

# Copierea codului sursă
COPY . .

# Expunerea portului 88
EXPOSE 88

# Comanda de pornire
CMD ["node", "server.js"]