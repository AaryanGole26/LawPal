# Use Python 3.10 slim base image
FROM python:3.10-slim

# Set working directory to /Server
WORKDIR Server

# Copy requirements.txt and install dependencies
COPY Server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Server directory contents
COPY Server/ .

# Expose the port (Railway will override with $PORT)
EXPOSE 7860

# Run Gunicorn with dynamic port
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "app:app"]
