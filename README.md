# F3 Region Pages

## Overview

F3 Region Pages is a web application for managing F3 regional content, workouts, and community information. This platform helps regional F3 communities organize their activities and connect members.

<video src="./docs/f3-region-pages-user-journey-example-2025-04-24.mp4" controls width="100%"></video>

## Features

- Regional workout calendar and scheduling
- Community member directory
- Event management
- Location tracking for workouts
- User authentication and authorization
- Mobile-friendly responsive design

## Tech Stack

- **Frontend:** React 19, Next.js 15
- **Styling:** TailwindCSS
- **Backend:** Next.js API routes
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Drizzle ORM
- **Testing:** Jest

## Getting Started

For detailed setup instructions, please refer to our [contribution guide](./CONTRIBUTORS.md).

### Quick Start

1. Ensure you have the prerequisites installed ([Node.js](https://nodejs.org/), [nvm](https://github.com/nvm-sh/nvm), [npm](https://www.npmjs.com/), and [Docker](https://www.docker.com/))
2. Clone the repository and install dependencies
3. Set up your local database environment
4. Start the development server with `npm run dev`

## Available Scripts

See the [contribution guide](./CONTRIBUTORS.md#available-scripts) for a complete list of npm scripts you can run.

## Deployment

Production deploys run on Google Cloud Run, not Firebase/App Hosting.

Target environment:

- Project: region-pages
- Region: us-central1
- Service: f3-region-pages

### One-time setup

1. Install and authenticate gcloud CLI.
2. Set project and default region:

	gcloud config set project region-pages
	gcloud config set run/region us-central1

3. Use the project Node version:

	nvm use 20.18.2

4. Enable pnpm via Corepack (recommended):

	corepack enable
	corepack pnpm --version

### Pre-deploy checks

Recommended before every deploy:

	corepack pnpm install
	corepack pnpm run lint
	corepack pnpm run test
	corepack pnpm run build

### Build and deploy commands

This repository should be built with the Google Buildpacks google-22 builder to keep Node 20 support.

1. Build a tagged container image:

	export IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
	export IMAGE=us-central1-docker.pkg.dev/region-pages/f3-region-pages/web:$IMAGE_TAG
	gcloud builds submit . \
	  --project region-pages \
	  --region us-central1 \
	  --pack "builder=gcr.io/buildpacks/builder:google-22,image=$IMAGE,env=GOOGLE_RUNTIME_VERSION=20.18.2"

2. Deploy image to Cloud Run:

	gcloud run deploy f3-region-pages \
	  --image "$IMAGE" \
	  --region us-central1 \
	  --project region-pages \
	  --quiet

3. Verify rollout:

	gcloud run services describe f3-region-pages \
	  --region us-central1 \
	  --project region-pages \
	  --format='value(status.latestReadyRevisionName,status.url,spec.template.spec.containers[0].image)'

### Required GCP access

The person running deployment commands should have:

- roles/run.admin on project region-pages
- roles/iam.serviceAccountUser on the Cloud Run runtime service account used by f3-region-pages
- roles/cloudbuild.builds.editor on project region-pages
- roles/logging.viewer (recommended for troubleshooting build/deploy logs)

The Cloud Build service account in region-pages must be able to push built images:

- roles/artifactregistry.writer on repository f3-region-pages in us-central1

Optional, if you also need to inspect service/runtime config:

- roles/run.viewer
- roles/artifactregistry.reader

## Contributing

We welcome contributions from the community! Please read our [contribution guide](./CONTRIBUTORS.md) for information on how to get started with development, coding standards, and our workflow.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you have questions or need assistance, please create an issue in this repository.
