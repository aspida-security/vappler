# Use the full, official Python image to ensure all system libraries are present
FROM python:3.11

# Set the working directory in the container to /app
WORKDIR /app

# Update the package list and install Nmap
RUN apt-get update && apt-get install -y nmap \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev

# Copy our list of Python libraries into the container
COPY requirements.txt .

# Install the Python libraries
RUN pip install --no-cache-dir -r requirements.txt

# Copy our application's code into the container
COPY . .

# Tell Docker that the container will listen on port 5000
EXPOSE 5000

# The command to run when the container starts using the Gunicorn server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "300", "api:app"]