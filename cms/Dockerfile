FROM php:8.1-fpm-alpine

# Install dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl

# Create necessary directories for supervisor
RUN mkdir -p /var/log/supervisor \
    && mkdir -p /etc/supervisor/conf.d

# Install PHP extensions required by Statamic
RUN docker-php-ext-install pdo_mysql zip gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set up work directory
WORKDIR /var/www/html

# Create new Statamic project
RUN composer create-project statamic/statamic .

# Configure Nginx
COPY nginx.conf /etc/nginx/http.d/default.conf

# Configure Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create template directories
RUN mkdir -p /var/www/html/resources/views/errors

# Create the templates directory in the image
RUN mkdir -p /templates/errors

# Copy your existing template files - we'll use COPY during docker build
COPY templates/layout.antlers.html /templates/
COPY templates/home.antlers.html /templates/
COPY templates/default.antlers.html /templates/
COPY templates/errors/404.antlers.html /templates/errors/

# Create the start.sh script properly
RUN echo '#!/bin/sh' > /start.sh && \
    echo '' >> /start.sh && \
    echo '# Ensure directories exist' >> /start.sh && \
    echo 'mkdir -p /var/www/html/resources/views/errors' >> /start.sh && \
    echo 'mkdir -p /var/www/html/database' >> /start.sh && \
    echo 'mkdir -p /var/www/html/content/collections/pages' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Copy templates if needed' >> /start.sh && \
    echo 'if [ ! -f /var/www/html/resources/views/layout.antlers.html ]; then' >> /start.sh && \
    echo '    echo "Initializing templates..."' >> /start.sh && \
    echo '    cp -f /templates/layout.antlers.html /var/www/html/resources/views/' >> /start.sh && \
    echo '    cp -f /templates/home.antlers.html /var/www/html/resources/views/' >> /start.sh && \
    echo '    cp -f /templates/default.antlers.html /var/www/html/resources/views/' >> /start.sh && \
    echo '    cp -f /templates/errors/404.antlers.html /var/www/html/resources/views/errors/' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Create SQLite database if needed' >> /start.sh && \
    echo 'if [ ! -f /var/www/html/database/database.sqlite ]; then' >> /start.sh && \
    echo '    echo "Creating SQLite database..."' >> /start.sh && \
    echo '    touch /var/www/html/database/database.sqlite' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Set up Statamic environment' >> /start.sh && \
    echo 'if [ ! -f /var/www/html/.env ]; then' >> /start.sh && \
    echo '    echo "Setting up Statamic environment..."' >> /start.sh && \
    echo '    cp -f .env.example .env' >> /start.sh && \
    echo '    php artisan key:generate --force' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Initialize Statamic (only if not already done)' >> /start.sh && \
    echo 'php artisan storage:link' >> /start.sh && \
    echo 'php artisan statamic:install --no-interaction' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Create default home page if needed' >> /start.sh && \
    echo 'if [ ! -f /var/www/html/content/collections/pages/home.md ]; then' >> /start.sh && \
    echo '    echo "Creating default home page..."' >> /start.sh && \
    echo '    echo -e "---\\ntitle: Home\\nid: home\\ntemplate: home\\n---\\n# Welcome to Our Platform\\n\\nThis is a multi-component web application featuring a real-time chat and an AI-powered face detection system." > /var/www/html/content/collections/pages/home.md' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Clear caches and optimize' >> /start.sh && \
    echo 'php artisan config:cache' >> /start.sh && \
    echo 'php artisan route:cache' >> /start.sh && \
    echo 'php artisan cache:clear' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Set proper permissions (very important)' >> /start.sh && \
    echo 'echo "Setting permissions..."' >> /start.sh && \
    echo 'chown -R www-data:www-data /var/www/html/storage' >> /start.sh && \
    echo 'chown -R www-data:www-data /var/www/html/content' >> /start.sh && \
    echo 'chown -R www-data:www-data /var/www/html/resources' >> /start.sh && \
    echo 'chown -R www-data:www-data /var/www/html/bootstrap/cache' >> /start.sh && \
    echo 'chown -R www-data:www-data /var/www/html/database' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'chmod -R 755 /var/www/html/storage' >> /start.sh && \
    echo 'chmod -R 755 /var/www/html/content' >> /start.sh && \
    echo 'chmod -R 755 /var/www/html/resources' >> /start.sh && \
    echo 'chmod -R 755 /var/www/html/bootstrap/cache' >> /start.sh && \
    echo 'chmod -R 755 /var/www/html/database' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Start supervisor' >> /start.sh && \
    echo 'echo "Starting services..."' >> /start.sh && \
    echo 'exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf' >> /start.sh

# Make the script executable
RUN chmod +x /start.sh

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Pre-initialize Statamic to reduce startup time
RUN cp .env.example .env && \
    php artisan key:generate && \
    php artisan storage:link && \
    php artisan statamic:install --no-interaction

# Expose port 80
EXPOSE 80

# Start services using our startup script
CMD ["/start.sh"]