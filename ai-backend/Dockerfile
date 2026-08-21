FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir \
       --extra-index-url https://download.pytorch.org/whl/cpu \
       -r requirements.txt
COPY backend/ backend/
# saved_models/ and data/ are volume mount points (docker-compose.yml); pre-creating them
# with the app user's ownership here is what a fresh volume inherits on first creation.
# An existing volume from an older, root-run image keeps its old ownership regardless —
# docker-entrypoint.sh re-chowns it on every start before dropping privileges.
RUN groupadd --system app && useradd --system --gid app app \
    && mkdir -p saved_models data && chown -R app:app /app
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 8000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
