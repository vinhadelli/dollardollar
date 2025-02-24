# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the current directory contents into the container at /app
COPY . /app

# Create instance directory
RUN mkdir -p /app/instance

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy .env file (optional, can also be mounted)
COPY .env /app/.env

# Expose the port the app runs on
EXPOSE 5001

# Use a production-ready command to run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "app:app"]
