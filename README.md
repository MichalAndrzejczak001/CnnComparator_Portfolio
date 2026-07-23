# CnnComparator

A web application for training and comparing convolutional neural network architectures on image classification tasks. Train six different CNN architectures on three standard datasets, then compare their accuracy, loss curves and training time side by side — with Grad-CAM visualizations to see what each model actually learned.

## Features

- **6 CNN architectures** — SimpleCNN, LeNet-5, AlexNet, VGG11, ResNet18, MobileNetV1
- **3 datasets** — MNIST, Fashion-MNIST, CIFAR-10
- **Head-to-head comparison** — train all six architectures on the same dataset/config and rank them by accuracy, loss and training time
- **Grad-CAM explainability** — visualize which pixels a trained model focused on when making a prediction
- **Interactive classification** — upload an image or draw a digit by hand and classify it with a trained model
- **Client-side augmentation preview** — rotate, flip, adjust brightness and add noise to an image before training
- **JWT authentication** — experiments are scoped to the authenticated user

## Architecture

Three independently deployable services:

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Frontend   │ ───▶ │  Logic Backend    │ ───▶ │   AI Backend    │
│ React + TS  │      │  Spring Boot      │      │  FastAPI        │
│ (Vite dev)  │ ◀─── │  auth, CRUD, JWT  │ ◀─── │  PyTorch models │
└─────────────┘      └─────────┬────────┘      └─────────────────┘
                                │
                          ┌─────▼─────┐
                          │   MySQL   │
                          └───────────┘
```

- **ai-backend** trains and evaluates the CNN models, generates Grad-CAM overlays, and has no authentication of its own — it's only reachable from `logic-backend` inside the Docker network, never exposed to the host.
- **logic-backend** owns users and experiments, proxies training/inference requests to `ai-backend`, and is the only service the frontend talks to.
- **frontend** is a Vite dev server (not a production nginx build — see [Known limitations](#known-limitations)) that proxies `/auth` and `/experiments` requests to `logic-backend`.

## Tech stack

| Layer | Stack |
|---|---|
| AI Backend | Python 3.10, FastAPI, PyTorch (CPU), Uvicorn |
| Logic Backend | Java 21, Spring Boot 4, Spring Security (JWT), Hibernate/JPA, MySQL |
| Frontend | React 19, TypeScript, Vite, Vitest, Cypress |
| Infra | Docker Compose, MySQL 8 |

## Getting started

### With Docker (recommended)

```bash
cp .env.example .env   # edit JWT_SECRET and DB credentials if you want
docker compose up --build
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Logic backend API: [http://localhost:8080](http://localhost:8080)
- ai-backend is only reachable from inside the Docker network (by design — it has no auth of its own)

### Running services locally

Each service can also run on its own, outside Docker:

**ai-backend**
```bash
cd ai-backend
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

**logic-backend** (needs `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `PYTHON_BACKEND_URL` in the environment)
```bash
cd logic-backend
./gradlew bootRun
```

**frontend**
```bash
cd frontend
npm install
npm run dev
```

## API overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Log in, returns a JWT |
| GET / POST | `/experiments` | List / create experiments |
| GET / DELETE | `/experiments/{id}` | Get / delete an experiment |
| POST | `/experiments/compare` | Train all 6 architectures on one dataset and compare results |
| POST | `/experiments/{id}/predict` | Classify an uploaded image |
| POST | `/experiments/{id}/gradcam` | Generate a Grad-CAM overlay for an uploaded image |

## Testing

Each layer has its own test suite, run independently:

```bash
cd ai-backend && pytest                # 33 tests — models, trainer, API
cd logic-backend && ./gradlew test     # 33 tests — 16 unit, 8 MockMvc integration, 9 Cucumber BDD scenarios
cd frontend && npm run test            # 15 unit tests (Vitest)
cd frontend && npm run test:e2e        # 10 end-to-end tests (Cypress, requires the dev server running)
```

## Project structure

```
CnnComparator_Portfolio/
├── ai-backend/       # FastAPI service: model training, evaluation, Grad-CAM
├── logic-backend/    # Spring Boot service: auth, experiment persistence, API gateway
├── frontend/         # React + TypeScript SPA
├── docker-compose.yml
└── .env.example
```

## Known limitations

Things I'm aware of and would tackle next, roughly in priority order:

- **`/experiments/compare` trains all 6 models sequentially**, not in parallel — a comparison run takes 6x as long as a single training run. Would move to a thread pool if this became a real bottleneck.
- **No request timeout tuning beyond the AI backend proxy** — `RestTemplate` has a 45-minute read timeout to accommodate long training runs, which also means a genuinely stuck request stays open for a long time.
- **Frontend Docker image runs the Vite dev server**, not a production build behind nginx — fine for a demo, not how I'd ship it.
- **No CI pipeline** wiring the three test suites together on push.

## License

MIT — see [LICENSE](LICENSE).
