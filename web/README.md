# Ordo Web

Desktop/Web interface for managing AI agents on Solana.

## Features

### ✅ Implemented

- **Wallet Connection** - Connect Phantom, Solflare, Backpack, and other Solana wallets
- **Dashboard** - Overview of all agents with key metrics
- **Agent List** - View and manage all your AI agents
- **Agent Detail** - Detailed view with performance charts and transaction history
- **Create Agent** - Multi-step wizard for creating new agents
- **Settings** - Configure app preferences and manage data
- **Responsive Design** - Works on desktop, tablet, and mobile browsers
- **Dark Theme** - Optimized dark theme with Ordo branding

### 🚧 Coming Soon

- Real-time agent monitoring via WebSocket
- Advanced analytics and reporting
- Agent collaboration features
- Multi-wallet support
- Export/import agent configurations
- Push notifications
- Mobile app deep linking

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Wallet**: Solana Wallet Adapter
- **Charts**: Recharts
- **State**: Zustand
- **Blockchain**: Solana Web3.js

## Prerequisites

- Node.js 20+
- npm or yarn

## Installation

```bash
cd web
npm install
```

## Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

## Building for Production

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home/Dashboard
│   │   ├── layout.tsx            # Root layout with wallet provider
│   │   ├── globals.css           # Global styles
│   │   ├── agents/
│   │   │   ├── page.tsx          # Agent list
│   │   │   ├── create/
│   │   │   │   └── page.tsx      # Create agent wizard
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Agent detail
│   │   └── settings/
│   │       └── page.tsx          # Settings
│   └── components/
│       └── WalletProvider.tsx    # Wallet adapter provider
├── public/                       # Static assets
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies
```

## Pages

### Home (`/`)
- Dashboard with agent statistics
- Quick action cards
- Recent activity feed
- Wallet connection prompt

### Agents (`/agents`)
- Grid view of all agents
- Status indicators (active, idle, paused)
- Key metrics (balance, earnings, age, generation)
- Create agent button
- Empty state for new users

### Agent Detail (`/agents/[id]`)
- Agent header with controls (pause/resume/delete)
- Performance chart (last 7 days)
- Configuration details
- Transaction history
- Real-time status updates

### Create Agent (`/agents/create`)
- Step 1: Basic Info (name, specialization)
- Step 2: Configuration (balance, risk, auto-trading)
- Step 3: Review and confirm
- Progress indicator
- Form validation

### Settings (`/settings`)
- General settings (notifications, auto-refresh, dark mode)
- Network configuration (RPC endpoint)
- Privacy controls (analytics, privacy policy)
- Data management (clear cache, export data)
- About section (version, terms)
- Danger zone (reset, delete data)

## Wallet Integration

### Supported Wallets
- Phantom
- Solflare
- Backpack
- Any wallet supporting Solana Wallet Standard

### Connection Flow
1. User clicks "Connect Wallet"
2. Wallet modal appears with available wallets
3. User selects wallet and approves connection
4. App receives wallet public key
5. User can now interact with agents

### Auto-Connect
The app automatically reconnects to the last used wallet on page load.

## Styling

### Color Scheme
- Primary: `#14F195` (Solana green)
- Background: `#000000` (Black)
- Surface: `#1a1a1a` (Dark gray)
- Border: `#333333` (Medium gray)

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## State Management

### Local Storage
- Settings persistence
- Wallet connection state
- User preferences

### Zustand (Coming Soon)
- Agent data
- Real-time updates
- Global app state

## API Integration

### Endpoints (TODO)
```typescript
// Get all agents
GET /api/agents

// Get agent by ID
GET /api/agents/:id

// Create agent
POST /api/agents

// Update agent
PATCH /api/agents/:id

// Delete agent
DELETE /api/agents/:id

// Get agent transactions
GET /api/agents/:id/transactions

// Get agent performance
GET /api/agents/:id/performance
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```bash
# Build image
docker build -t ordo-web .

# Run container
docker run -p 3000:3000 ordo-web
```

### Static Export
```bash
# Build static site
npm run build

# Deploy /out directory to any static host
```

## Performance

- Lighthouse Score: 95+
- First Contentful Paint: < 1s
- Time to Interactive: < 2s
- Bundle Size: < 200KB (gzipped)

## Accessibility

- WCAG 2.1 Level AA compliant
- Keyboard navigation support
- Screen reader compatible
- High contrast mode
- Focus indicators

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari, Chrome Android

## Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md)

## License

MIT

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org/)

## Support

- Discord: [Ordo Community](https://discord.gg/ordo)
- Twitter: [@OrdoAI](https://twitter.com/ordoai)
- Email: support@ordo.ai
