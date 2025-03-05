# Use a more specific base image that supports multiple architectures
FROM --platform=$TARGETPLATFORM ubuntu:20.04

# Set environment variables
ENV OPENSSL_LEGACY_PROVIDER=1
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONWARNINGS=ignore
ENV OPENSSL_CONF=/etc/ssl/openssl-legacy.cnf
ENV OPENSSL_ENABLE_MD5_VERIFY=1
ENV NODE_OPTIONS=--openssl-legacy-provider

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    build-essential \
    curl \
    libssl-dev \
    postgresql-client \
    libpq-dev \
    cron \
    && rm -rf /var/lib/apt/lists/* \
    && pip install scrypt

# Create OpenSSL legacy config to fix the digital envelope issue
RUN mkdir -p /etc/ssl
RUN echo "[openssl_init]\nlegacy = 1\nproviders = provider_sect\n\n[provider_sect]\ndefault = default_sect\nlegacy = legacy_sect\n\n[default_sect]\nactivate = 1\n\n[legacy_sect]\nactivate = 1" > /etc/ssl/openssl-legacy.cnf

# Set up a virtual environment
RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Upgrade pip
RUN pip install --upgrade pip

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install gunicorn
RUN pip install --no-cache-dir gunicorn==20.1.0

# Copy application code
COPY . .

# Create patch for SSL in app.py
RUN echo "import ssl\n\n# Legacy OpenSSL support\ntry:\n    ssl._create_default_https_context = ssl._create_unverified_context\nexcept AttributeError:\n    pass" > ssl_fix.py

# Apply the patch
RUN cat ssl_fix.py app.py > temp_app.py && mv temp_app.py app.py

# Set up cron job for updating currencies
RUN echo "0 1 * * * /venv/bin/python /app/update_currencies.py >> /var/log/cron.log 2>&1" | crontab -

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py

# Expose the port
EXPOSE 5001

# Create an entrypoint script to start cron and gunicorn
RUN echo '#!/bin/bash\n\
# Start cron\n\
cron\n\
\n\
# Run the main container command\n\
exec /venv/bin/gunicorn --bind 0.0.0.0:5001 --workers=3 --timeout=120 app:app\n\
' > /entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /entrypoint.sh

# Use multi-stage build support
ARG TARGETPLATFORM

# Use the entrypoint script
CMD ["/entrypoint.sh"]