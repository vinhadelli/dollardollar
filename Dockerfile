# Use a more specific base image that supports multiple architectures
FROM --platform=$TARGETPLATFORM ubuntu:22.04

# Set non-interactive installation and prevent apt from prompting
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    build-essential \
    curl \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

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

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 
ENV PYTHONUNBUFFERED=1 
ENV FLASK_APP=app.py

# Expose the port
EXPOSE 5001

# Use multi-stage build support
ARG TARGETPLATFORM

# Use the absolute path to gunicorn from the virtual environment
CMD ["/venv/bin/gunicorn", "--bind", "0.0.0.0:5001", "--workers=3", "--timeout=120", "app:app"]