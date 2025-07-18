FROM python:3.10-slim

WORKDIR /app

COPY Server/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY Server/ .

EXPOSE 8080

CMD ["python", "app.py"]
