FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir \
       --extra-index-url https://download.pytorch.org/whl/cpu \
       -r requirements.txt
COPY backend/ backend/
# saved_models/ and data/ are volume mount points (docker-compose.yml); pre-creating them
# with the app user's ownership here is what the volumes inherit on first creation.
RUN groupadd --system app && useradd --system --gid app app \
    && mkdir -p saved_models data && chown -R app:app /app
USER app
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
