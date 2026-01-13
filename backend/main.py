"""
FastAPI Backend for Justin Wallet Agent System

This server provides REST API endpoints for:
- Starting AI agent sessions
- Checking x402 payment requirements
- Managing payment negotiations
- Executing approved payments
"""

import os
import uuid
from typing import Optional, Literal
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import agents
from agents.payment_agent import agent_runner

# ============== FastAPI App ==============

app = FastAPI(
    title="Justin Wallet Agent API",
    description="AI-powered payment agents for x402 protocol",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Request/Response Models ==============

class StartSessionRequest(BaseModel):
    user_address: str
    target_url: str
    task_type: Literal["check_url", "negotiate", "pay"] = "check_url"


class StartSessionResponse(BaseModel):
    session_id: str
    status: str
    requires_payment: bool
    payment_request: Optional[dict] = None
    content: Optional[str] = None
    messages: list


class ApprovePaymentRequest(BaseModel):
    session_id: str


class ConfirmTransactionRequest(BaseModel):
    session_id: str
    tx_hash: str


class SessionStatusResponse(BaseModel):
    session_id: str
    status: str
    requires_payment: bool
    payment_request: Optional[dict] = None
    content: Optional[str] = None
    tx_hash: Optional[str] = None
    error: Optional[str] = None
    messages: list


class NegotiateRequest(BaseModel):
    session_id: str
    counter_offer: Optional[str] = None


# ============== API Endpoints ==============

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Justin Wallet Agent API",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "active_sessions": len(agent_runner.sessions),
        "timestamp": datetime.now().isoformat()
    }


@app.post("/agent/start", response_model=StartSessionResponse)
async def start_agent_session(request: StartSessionRequest):
    """
    Start a new agent session to analyze a URL
    
    This will:
    1. Check if the URL requires x402 payment
    2. Parse payment details if required
    3. Return the analysis result
    """
    session_id = str(uuid.uuid4())
    
    try:
        result = await agent_runner.start_session(
            session_id=session_id,
            user_address=request.user_address,
            target_url=request.target_url,
            task_type=request.task_type
        )
        
        return StartSessionResponse(
            session_id=session_id,
            status=result['status'],
            requires_payment=result['requires_payment'],
            payment_request=result.get('payment_request'),
            content=result.get('content'),
            messages=result.get('messages', [])
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agent/status/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    """Get the current status of an agent session"""
    session = agent_runner.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionStatusResponse(
        session_id=session_id,
        status=session['status'],
        requires_payment=session['requires_payment'],
        payment_request=session.get('payment_request'),
        content=session.get('content'),
        tx_hash=session.get('tx_hash'),
        error=session.get('error'),
        messages=session.get('messages', [])
    )


@app.post("/agent/approve", response_model=SessionStatusResponse)
async def approve_payment(request: ApprovePaymentRequest):
    """
    Approve a pending payment
    
    This signals the agent that the user has approved the payment
    and it should proceed with execution preparation.
    """
    try:
        result = await agent_runner.approve_payment(request.session_id)
        
        return SessionStatusResponse(
            session_id=request.session_id,
            status=result['status'],
            requires_payment=result['requires_payment'],
            payment_request=result.get('payment_request'),
            content=result.get('content'),
            tx_hash=result.get('tx_hash'),
            error=result.get('error'),
            messages=result.get('messages', [])
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/confirm", response_model=SessionStatusResponse)
async def confirm_transaction(request: ConfirmTransactionRequest):
    """
    Confirm that a transaction was executed
    
    Called by the frontend after the blockchain transaction is complete.
    """
    try:
        result = await agent_runner.confirm_transaction(
            request.session_id,
            request.tx_hash
        )
        
        return SessionStatusResponse(
            session_id=request.session_id,
            status=result['status'],
            requires_payment=result['requires_payment'],
            payment_request=result.get('payment_request'),
            content=result.get('content'),
            tx_hash=result.get('tx_hash'),
            error=result.get('error'),
            messages=result.get('messages', [])
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/negotiate", response_model=SessionStatusResponse)
async def negotiate_payment(request: NegotiateRequest):
    """
    Request the agent to negotiate the payment terms
    
    Currently uses AI to analyze if the price is reasonable.
    Future versions could support actual negotiation protocols.
    """
    session = agent_runner.get_session(request.session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.get('requires_payment'):
        raise HTTPException(status_code=400, detail="No payment to negotiate")
    
    # Update session for negotiation
    session['task_type'] = 'negotiate'
    if request.counter_offer:
        session['counter_offer'] = request.counter_offer
    
    try:
        # Re-run with negotiation
        from agents.payment_agent import negotiate_node
        result = await negotiate_node(session)
        
        agent_runner.sessions[request.session_id] = result
        
        return SessionStatusResponse(
            session_id=request.session_id,
            status=result['status'],
            requires_payment=result['requires_payment'],
            payment_request=result.get('payment_request'),
            content=result.get('content'),
            tx_hash=result.get('tx_hash'),
            error=result.get('error'),
            messages=result.get('messages', [])
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/agent/session/{session_id}")
async def cancel_session(session_id: str):
    """Cancel and remove an agent session"""
    if session_id in agent_runner.sessions:
        del agent_runner.sessions[session_id]
        return {"status": "cancelled", "session_id": session_id}
    
    raise HTTPException(status_code=404, detail="Session not found")


# ============== Run Server ==============

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    
    print(f"""
    ╔════════════════════════════════════════════╗
    ║   Justin Wallet Agent API                  ║
    ║   Starting on http://localhost:{port}        ║
    ╚════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
