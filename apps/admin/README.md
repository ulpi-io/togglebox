# ToggleBox App

Production-ready dashboard for managing remote configurations and feature flags.

## Features

- 🔐 **Authentication**: Login, register, password reset
- 👥 **User Management**: User management panel
- 🔑 **API Keys**: Generate and manage API keys
- 🎯 **Platforms & Environments**: Multi-platform support
- ⚙️ **Configuration**: Version-controlled config management
- 🚩 **Feature Flags**: Advanced phased rollouts (percentage, targeted)
- 🧪 **Evaluation**: Test flags with different contexts
- 💾 **Cache Management**: Granular cache invalidation
- 📊 **Webhooks**: Monitor cache invalidations

## Tech Stack

- **Next.js 15** with App Router
- **React 19** with Server Components
- **TypeScript 5.7** (strict mode)
- **Tailwind CSS** with ploon.ai-inspired design
- **Radix UI** for accessible components
- **Zod** for validation
- **Monaco Editor** for JSON editing

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm dev
```

Visit [http://localhost:3001](http://localhost:3001)

## Environment Variables

See `.env.example` for required configuration.

## Design System

Inspired by ploon.ai:
- **Colors**: Pure black on white
- **Borders**: 2px black borders
- **Typography**: Bold headers, standard body
- **Style**: Minimalist, brutalist, high contrast

## API Coverage

Implements all 56 endpoints:
- Health (1)
- Authentication (6)
- Users (6)
- API Keys (4)
- Platforms (3)
- Environments (3)
- Config Versions (5)
- Feature Flags (6)
- Evaluation (2)
- Cache Management (4)
- Webhooks (3)

## Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Or use Docker
docker build -t togglebox-app .
docker run -p 3001:3001 togglebox-app
```

## License

**Elastic License 2.0** - You can use, modify, and distribute this software for any purpose **except** providing it as a hosted/managed service to third parties.

See the main [LICENSE](../../LICENSE) file for full details.

## Contributing

⚠️ **Note:** This project is not yet initialized as a git repository.

Contributions guidelines will be added once the project is set up with version control.
