# Orbita

## Educational Purpose

This project was created primarily for **educational and learning purposes**.  
While it is well-structured and could technically be used in production, it is **not intended for commercialization**.  
The main goal is to explore and demonstrate best practices, patterns, and technologies in software development.

## Description

**Orbita** is a browser-based 3D object viewer built with Three.js and vanilla TypeScript. It lets you explore, inspect, and customize 3D geometry and imported models directly in the browser — no installation, no plugins, no frameworks.

**Built-in geometry library**

The application ships with 14 predefined Three.js geometries: Box, Cone, Capsule, Circle, Cylinder, Dodecahedron, Icosahedron, Octahedron, Plane, Ring, Sphere, Tetrahedron, Torus, and Torus Knot. You can cycle through all of them using the Arrow Left / Arrow Right keys on your keyboard, or the on-screen navigation controls. Each geometry is rendered with a physically-based metallic material and placed inside a cube-map environment to simulate realistic reflections.

**GLTF / GLB model import**

Beyond the built-in shapes, Orbita supports importing your own 3D models in `.glb` or `.gltf` format. Once loaded, the model is added to the navigation queue alongside the built-in geometries, so you can jump to it with the arrow keys. A modal notification confirms when the model was successfully added or alerts you if something went wrong during the load.

**Live property controls**

Every object in the scene exposes a real-time control panel powered by lil-gui:

- **Position** — move the model along the X, Y, and Z axes independently.
- **Scale** — resize the model on each axis individually (X, Y, Z).
- **Color** — pick any color for the material in real time.
- **Text visibility** — toggle the 3D floating label that displays the object name above the geometry.

All changes are reflected instantly in the canvas without any page reload.

**Camera and scene**

The camera is orbit-controlled, meaning you can rotate around the object by clicking and dragging, zoom in and out with the scroll wheel, and pan by right-clicking. Damping is enabled to give the movement a natural, smooth feel. The scene background is a preloaded environment cube map that provides ambient lighting and reflections, making metallic materials look realistic out of the box.

**Fully responsive**

The canvas automatically adapts to the browser window size. Resizing the window updates the camera aspect ratio and the renderer resolution on the fly, so the scene always fills the viewport correctly regardless of the screen size or device.

## Technologies used

1. Typescript
2. CSS3
3. HTML5
4. Vite
5. Nginx
6. Docker
7. Three JS

## Libraries used

The stack above is wired up through the following packages:

#### Dependencies

```
"lil-gui": "^0.17.0"
"three": "^0.148.0"
```

#### devDependencies

```
"@eslint/js": "^9.39.2"
"@testing-library/dom": "^10.4.0"
"@testing-library/jest-dom": "^6.6.3"
"@testing-library/user-event": "^14.5.2"
"@types/jest": "^30.0.0"
"@types/node": "^22.0.0"
"@types/three": "^0.161.2"
"eslint": "^9.39.2"
"eslint-config-prettier": "^10.1.8"
"eslint-plugin-prettier": "^5.5.5"
"globals": "^17.3.0"
"husky": "^9.1.7"
"jest": "^30.3.0"
"jest-environment-jsdom": "^30.3.0"
"lint-staged": "^16.2.7"
"prettier": "^3.8.1"
"ts-jest": "^29.4.6"
"typescript": "^5.3.3"
"typescript-eslint": "^8.54.0"
"vite": "^7.1.6"
```

## Getting Started

To run Orbita locally on bare metal (no containers):

1. Clone the repository
2. Navigate to the project folder
3. Execute: `npm install`
4. Execute: `npm run dev`

The application will open automatically at `http://localhost:3000`.

> If you prefer a containerized workflow instead, jump to the [Production](#production) section for the Docker-based setup.

## Testing

Once the project is set up, verify that everything works as expected by running the test suite.

1. Navigate to the project folder
2. Execute: `npm test`

For a coverage report:

```bash
npm run test:coverage
```

## Continuous Integration & Deployment

The repository ships with a **GitHub Actions** pipeline defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). It runs automatically on every `push` and `pull_request` targeting the `main` branch. On a push to `main` it goes one step further: it publishes the production image to **GitHub Container Registry (GHCR)** and deploys it to the server.

In-progress runs for the same ref are cancelled automatically (`concurrency` group), so only the latest commit is built.

### Pipeline overview

```
                 ┌──── PR or push to main ────┐                 push to main only
                 ▼                            ▼                         │
┌───────────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────────┐ ┌──────────────────┐
│ lint-and-audit│▶│ testing │▶│  build  │▶│      docker      │▶│      deploy      │
│ eslint · tsc  │ │  jest   │ │ tsc+vite│ │ build & push GHCR │ │ ssh via cf tunnel│
└───────────────┘ └─────────┘ └─────────┘ └──────────────────┘ └──────────────────┘
```

### Validation jobs (run on every PR and push)

1. **`lint-and-audit`** — `npm run lint` (ESLint) and `npm run type-check` (`tsc --noEmit`).
2. **`testing`** — `npm run test` (Jest with the jsdom environment). Depends on `lint-and-audit`.
3. **`build`** — `npm run build`, which type-checks with `tsc` and produces the Vite production bundle. Depends on `testing`.

### Release & deploy jobs (push to `main` only)

4. **`docker`** — builds the production image from `Dockerfile.production` with Docker Buildx and a GitHub Actions layer cache, then pushes it to GHCR as `ghcr.io/diegolibonati/orbita:latest` and `ghcr.io/diegolibonati/orbita:sha-<commit>`. On pull requests the image is built for validation but **not** pushed. Depends on `build`.
5. **`deploy`** — reaches the server through a **Cloudflare Access** tunnel instead of a public SSH port. It installs `cloudflared` (pinned to `2026.5.1` — newer `2026.6.x` releases have a service-token bug), writes the SSH key and an SSH config whose `ProxyCommand` runs `cloudflared access ssh` authenticated with a Cloudflare Access service token, then copies `prod.docker-compose.yml` to the server over `scp` and pulls the freshly published image and recreates the container over `ssh` (`docker compose pull && up -d`, followed by `docker image prune`). Runs only on push to `main`, inside a `production` environment, and is serialized through a `deploy-production` concurrency group. Depends on `docker`.

Each job runs on `ubuntu-latest`, pins the Node version via [`.nvmrc`](.nvmrc) using `actions/setup-node@v4` with npm cache, and installs dependencies with `npm ci` for reproducibility. Jobs are chained with `needs:`, so a failure on any earlier stage short-circuits the rest of the pipeline.

### Required secrets

The deploy job authenticates to GHCR with the built-in `GITHUB_TOKEN` and reaches the server through a **Cloudflare Access** tunnel using the following repository **secrets** (never exposed to pull requests):

| Secret                    | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `SSH_HOST`                | Cloudflare Access SSH hostname of the server                   |
| `SSH_USER`                | SSH user                                                       |
| `SSH_KEY`                 | Private SSH key for that user                                  |
| `CF_ACCESS_CLIENT_ID`     | Cloudflare Access service token client ID (`ProxyCommand`)     |
| `CF_ACCESS_CLIENT_SECRET` | Cloudflare Access service token client secret (`ProxyCommand`) |
| `DEPLOY_PATH`             | Directory on the server that holds the compose file            |

### Where the build outputs live

| Output                                 | Location                                                             |
| -------------------------------------- | -------------------------------------------------------------------- |
| Lint, type-check, test, and build logs | **Actions** tab on GitHub                                            |
| Vite production bundle (`dist/`)       | Ephemeral, inside the runner                                         |
| Production Docker image                | **GHCR** — `ghcr.io/diegolibonati/orbita:latest` and `:sha-<commit>` |

### Running the same checks locally

```bash
# lint-and-audit
npm run lint
npm run type-check

# testing
npm test

# build
npm run build

# docker (build only; the pipeline also pushes this image to GHCR on main)
docker build -f Dockerfile.production -t ghcr.io/diegolibonati/orbita:latest .
```

## Security Audit

Before shipping, audit the dependency tree for known vulnerabilities:

```bash
npm audit
```

## Production

For a production-like or containerized environment, Orbita ships with Docker configurations for both development and production. Before deploying, make sure to run [Testing](#testing) and [Security Audit](#security-audit).

> **Prerequisites:** install [Docker Desktop](https://www.docker.com/products/docker-desktop) (required on Windows). All commands must be executed from the folder containing the `dev.docker-compose.yml` and `prod.docker-compose.yml` files.

### Dev

1. Clone the repository with `git clone "repository link"`
2. Execute: `npm install` or `yarn install` in the terminal
3. Execute: `docker-compose -f dev.docker-compose.yml build --no-cache` in the terminal
4. Once built, execute: `docker-compose -f dev.docker-compose.yml up --force-recreate` in the terminal

### Prod

The production compose file no longer builds locally — it **pulls** the image published to GHCR by the CI/CD pipeline (`ghcr.io/diegolibonati/orbita:latest`).

1. Execute: `docker compose -f prod.docker-compose.yml pull` in the terminal
2. Execute: `docker compose -f prod.docker-compose.yml up -d` in the terminal

The container listens on `8080` and is exposed on host port **9002** by default. Override it with the `APP_PORT` environment variable, e.g. `APP_PORT=8000 docker compose -f prod.docker-compose.yml up -d`.

> The image must exist in GHCR first. It is published automatically on every push to `main`; to build and push it manually run `docker build -f Dockerfile.production -t ghcr.io/diegolibonati/orbita:latest .` followed by `docker push ghcr.io/diegolibonati/orbita:latest` (requires `docker login ghcr.io`).

## Known Issues

None at the moment.

## Portfolio Link

[`https://www.diegolibonati.com.ar/#/project/orbita`](https://www.diegolibonati.com.ar/#/project/orbita)
