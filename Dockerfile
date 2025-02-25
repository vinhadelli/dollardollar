# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Add environment variables for app configuration
ENV SECRET_KEY=your_production_secret_key
ENV DEVELOPMENT_MODE=False
ENV DISABLE_SIGNUPS=True

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create the instance directory during image build
RUN mkdir -p /app/instance && chmod 777 /app/instance

# Copy the application code
COPY . /app/

# Expose the port the app runs on
EXPOSE 5001

# Use a production-ready command to run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "app:app"]