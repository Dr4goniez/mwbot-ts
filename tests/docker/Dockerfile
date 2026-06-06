FROM mediawiki:1.45.3

RUN apt-get update && apt-get install -y git curl unzip && rm -rf /var/lib/apt/lists/*

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install OAuth extension
RUN git -C /var/www/html/extensions clone -b REL1_45 https://gerrit.wikimedia.org/r/mediawiki/extensions/OAuth

RUN composer install --no-dev --working-dir=/var/www/html/extensions/OAuth --prefer-dist