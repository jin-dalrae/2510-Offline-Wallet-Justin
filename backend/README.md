# LangGraph Agent Backend for Justin Wallet

This backend provides AI-powered autonomous agents for:
- x402 protocol payment automation
- Transaction negotiation
- Smart payment routing
- **Batch payments** - Execute multiple payments in sequence
- **Scheduled payments** - Set up future or recurring payments

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Add your OpenAI API key
```

## Running

```bash
python main.py
```

The server will start on http://localhost:8000

## API Endpoints

### Single Payment Agent

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent/start` | Start a new agent session to analyze a URL |
| GET | `/agent/status/{session_id}` | Get agent session status |
| POST | `/agent/approve` | Approve a pending payment |
| POST | `/agent/confirm` | Confirm transaction was executed |
| POST | `/agent/negotiate` | Request AI negotiation analysis |
| DELETE | `/agent/session/{session_id}` | Cancel an agent session |

### Batch Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/batch/start` | Start a batch payment session |
| POST | `/batch/approve/{session_id}` | Approve and execute batch |
| POST | `/batch/confirm` | Confirm a single payment in batch |
| GET | `/batch/status/{session_id}` | Get batch payment status |

**Example - Start Batch Payment:**
```json
POST /batch/start
{
  "user_address": "0x...",
  "payments": [
    {"recipient": "0x123...", "amount": "10.00", "token": "USDC"},
    {"recipient": "0x456...", "amount": "5.50", "token": "USDC"},
    {"recipient": "0x789...", "amount": "25.00", "token": "EURC"}
  ]
}
```

### Scheduled Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/schedule/add` | Add a scheduled/recurring payment |
| GET | `/schedule/list/{user_address}` | List user's scheduled payments |
| POST | `/schedule/check/{user_address}` | Check and execute due payments |
| DELETE | `/schedule/cancel/{user_address}/{payment_id}` | Cancel a scheduled payment |

**Example - Schedule Recurring Payment:**
```json
POST /schedule/add
{
  "user_address": "0x...",
  "recipient": "0x123...",
  "amount": "50.00",
  "token": "USDC",
  "schedule_type": "recurring",
  "execute_at": "2024-01-15T09:00:00Z",
  "recurring_interval_seconds": 604800  // Weekly (7 days)
}
```

**Schedule Types:**
- `immediate` - Execute right away
- `scheduled` - Execute at a specific time
- `recurring` - Execute repeatedly at intervals

## Architecture

```
backend/
├── agents/
│   ├── __init__.py          # Agent exports
│   ├── payment_agent.py     # x402 URL payment agent
│   └── multi_payment_agent.py  # Batch & scheduled payments
├── main.py                  # FastAPI server
├── requirements.txt         # Dependencies
└── .env.example            # Environment template
```

## Features

### 1. x402 Payment Agent
- Analyzes URLs for payment requirements
- Parses payment headers (WWW-Authenticate, Accept-Payment)
- AI-powered price negotiation analysis
- Transaction execution preparation

### 2. Batch Payment Agent
- Process multiple payments in sequence
- Calculate totals by token
- User approval before execution
- Track individual payment confirmations
- Report successes and failures

### 3. Payment Scheduler
- Schedule payments for future execution
- Set up recurring payments (daily, weekly, monthly, etc.)
- Automatic execution when due
- Cancel pending scheduled payments

## Integration with Frontend

The frontend `SmartPayUrl` component connects to this backend:

```typescript
import { agentService } from '../lib/agentService';

// Start session
const session = await agentService.startSession(address, url, 'check_url');

// Approve payment
await agentService.approvePayment(session.session_id);

// Confirm transaction
await agentService.confirmTransaction(session.session_id, txHash);
```
