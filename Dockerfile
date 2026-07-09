# Base image: Python 3.11 slim variant for container footprint efficiency
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Ensure that output and input mount points exist in the container
RUN mkdir -p /input /output

# Copy requirements file first to utilize Docker layer caching
COPY requirements.txt .

# Install application dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application source code
COPY . .

# Set default execution command running the Horcrux evaluation pipeline
ENTRYPOINT ["python", "-m", "backend.app.pipeline", "--input", "/input/tasks.json", "--output", "/output/results.json"]
