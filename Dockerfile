FROM php:8.2-apache

# Install system packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libpq-dev \
    cron \
    curl \
    tzdata \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set timezone to German time
RUN ln -sf /usr/share/zoneinfo/Europe/Berlin /etc/localtime \
    && echo "Europe/Berlin" > /etc/timezone

# Install PHP extensions including Redis
RUN docker-php-ext-install pdo pdo_pgsql \
    && pecl install redis \
    && docker-php-ext-enable redis

# Install Composer and PHP dependencies (PHPMailer)
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
COPY composer.json /var/www/html/
RUN cd /var/www/html && composer install --no-dev --optimize-autoloader

# Create Python virtual environment and install packages
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install requests beautifulsoup4

# Enable Apache modules
RUN a2enmod rewrite headers

# Copy application files
COPY api/ /var/www/html/
COPY public/ /var/www/html/public/
COPY scripts/ /var/www/html/scripts/

# Create .htaccess for routing
RUN echo 'RewriteEngine On' > /var/www/html/.htaccess \
    && echo '# Admin panel and Bible search files exist and should be served directly' >> /var/www/html/.htaccess \
    && echo 'RewriteCond %{REQUEST_FILENAME} -f' >> /var/www/html/.htaccess \
    && echo 'RewriteRule ^(admin\.php|bible_search\.php|church_events\.php|services\.php|losungen_db\.php|newsletter\.php|sunday\.php)$ - [L]' >> /var/www/html/.htaccess \
    && echo '# Non-existing files with conditions' >> /var/www/html/.htaccess \
    && echo 'RewriteCond %{REQUEST_FILENAME} !-f' >> /var/www/html/.htaccess \
    && echo 'RewriteCond %{REQUEST_FILENAME} !-d' >> /var/www/html/.htaccess \
    && echo '# API calls go to index.php' >> /var/www/html/.htaccess \
    && echo 'RewriteCond %{QUERY_STRING} api_key=' >> /var/www/html/.htaccess \
    && echo 'RewriteRule ^(.*)$ /index.php [QSA,L]' >> /var/www/html/.htaccess \
    && echo '# Root without api_key goes to landingpage' >> /var/www/html/.htaccess \
    && echo 'RewriteCond %{QUERY_STRING} !api_key=' >> /var/www/html/.htaccess \
    && echo 'RewriteRule ^/?$ /public/index.html [L]' >> /var/www/html/.htaccess

# Setup cron for daily translation cache at 00:02 (not needed for base Losungen - those come from DB)
RUN echo '2 0 * * * root /usr/local/bin/php /var/www/html/scripts/daily_fetch.php >> /proc/1/fd/1 2>&1' > /etc/cron.d/daily-fetch \
    && chmod 0644 /etc/cron.d/daily-fetch \
    && crontab /etc/cron.d/daily-fetch

# Newsletter cron - runs hourly to check for scheduled sends
RUN echo '0 * * * * root /usr/local/bin/php /var/www/html/scripts/newsletter_send.php >> /proc/1/fd/1 2>&1' > /etc/cron.d/newsletter \
    && chmod 0644 /etc/cron.d/newsletter

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod +x /var/www/html/scripts/daily_fetch.php

# Configure Apache to log to stdout/stderr for Docker
RUN ln -sf /dev/stdout /var/log/apache2/access.log \
    && ln -sf /dev/stderr /var/log/apache2/error.log

# Configure PHP to log errors to stderr and set timezone
RUN echo 'log_errors = On' >> /usr/local/etc/php/conf.d/docker-php-errors.ini \
    && echo 'error_log = /dev/stderr' >> /usr/local/etc/php/conf.d/docker-php-errors.ini \
    && echo 'date.timezone = Europe/Berlin' >> /usr/local/etc/php/conf.d/docker-php-errors.ini

# Fix Apache ServerName warning
RUN echo 'ServerName losungen-api' >> /etc/apache2/apache2.conf

# Reduce Apache log noise (suppress startup notices etc.)
RUN sed -i 's/^LogLevel .*/LogLevel warn/' /etc/apache2/apache2.conf

# Start script that runs both Apache and Cron
RUN echo '#!/bin/bash' > /start.sh \
    && echo 'echo "=== LOSUNGEN API CONTAINER STARTING ==="' >> /start.sh \
    && echo 'echo "Container: losungen-api (Herrnhuter Losungen API)"' >> /start.sh \
    && echo 'echo "Database: PostgreSQL (translation cache active)"' >> /start.sh \
    && echo 'echo "Logs: Available in docker logs"' >> /start.sh \
    && echo 'echo "Starting CRON daemon for translation cache..."' >> /start.sh \
    && echo 'service cron start' >> /start.sh \
    && echo 'echo "CRON: Translation cache refresh scheduled for 00:02 UTC"' >> /start.sh \
    && echo 'echo "Base Losungen from database + translations from scraper"' >> /start.sh \
    && echo 'echo "Starting Apache2..."' >> /start.sh \
    && echo 'echo "=== LOSUNGEN API READY ==="' >> /start.sh \
    && echo 'apache2-foreground' >> /start.sh \
    && chmod +x /start.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["/start.sh"]