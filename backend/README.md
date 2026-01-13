# LangGraph Agent Backend for Justin Wallet

This backend provides AI-powered autonomous agents for:
- x402 protocol payment automation
- Transaction negotiation
- Smart payment routing

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running

```bash
python main.py
```

The server will start on http://localhost:8000

## API Endpoints

- `POST /agent/negotiate` - Start a negotiation session
- `POST /agent/pay` - Execute an autonomous x402 payment
- `GET /agent/status/{session_id}` - Get agent session status
- `POST /agent/approve` - Approve a pending agent action
