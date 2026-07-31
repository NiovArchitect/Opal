FROM python:3.12-slim

WORKDIR /app

COPY services/opal_ai/pyproject.toml /app/services/opal_ai/pyproject.toml
COPY services/opal_ai/opal_ai /app/services/opal_ai/opal_ai
COPY packages/contracts /app/packages/contracts

WORKDIR /app/services/opal_ai
RUN pip install --no-cache-dir -e .

ENV PYTHONUNBUFFERED=1
ENV OPAL_AI_DEBUG=1
EXPOSE 8000

CMD ["uvicorn", "opal_ai.main:app", "--host", "0.0.0.0", "--port", "8000"]
