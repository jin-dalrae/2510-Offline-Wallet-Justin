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
from agents.multi_payment_agent import multi_payment_runner, scheduler_runner


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


# ============== Batch Payment Endpoints ==============

class BatchPaymentRequest(BaseModel):
    user_address: str
    payments: list  # List of {recipient, amount, token, description?}


class BatchPaymentResponse(BaseModel):
    session_id: str
    status: str
    total_amount: str
    payment_count: int
    requires_approval: bool
    messages: list


class ConfirmBatchPaymentRequest(BaseModel):
    session_id: str
    payment_index: int
    tx_hash: str
    success: bool = True


@app.post("/batch/start", response_model=BatchPaymentResponse)
async def start_batch_payment(request: BatchPaymentRequest):
    """
    Start a batch payment session
    
    Prepares multiple payments to be executed sequentially.
    """
    session_id = str(uuid.uuid4())
    
    try:
        result = await multi_payment_runner.start_batch(
            session_id=session_id,
            user_address=request.user_address,
            payments=request.payments
        )
        
        return BatchPaymentResponse(
            session_id=session_id,
            status=result['status'],
            total_amount=result['total_amount'],
            payment_count=len(result['payments']),
            requires_approval=result['requires_approval'],
            messages=result['messages']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch/approve/{session_id}", response_model=BatchPaymentResponse)
async def approve_batch_payment(session_id: str):
    """Approve and start executing a batch payment"""
    try:
        result = await multi_payment_runner.approve_and_execute(session_id)
        
        return BatchPaymentResponse(
            session_id=session_id,
            status=result['status'],
            total_amount=result['total_amount'],
            payment_count=len(result['payments']),
            requires_approval=result['requires_approval'],
            messages=result['messages']
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch/confirm")
async def confirm_batch_payment(request: ConfirmBatchPaymentRequest):
    """Confirm a single payment in the batch was executed"""
    try:
        result = await multi_payment_runner.confirm_payment(
            request.session_id,
            request.payment_index,
            request.tx_hash,
            request.success
        )
        
        return {
            "session_id": request.session_id,
            "status": result['status'],
            "completed": len([p for p in result['completed_payments'] if p.get('status') == 'confirmed']),
            "failed": len(result['failed_payments']),
            "messages": result['messages']
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/batch/status/{session_id}")
async def get_batch_status(session_id: str):
    """Get the status of a batch payment session"""
    session = multi_payment_runner.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "status": session['status'],
        "total_amount": session['total_amount'],
        "completed": len([p for p in session['completed_payments'] if p.get('status') == 'confirmed']),
        "pending": len([p for p in session['completed_payments'] if p.get('status') == 'pending_confirmation']),
        "failed": len(session['failed_payments']),
        "messages": session['messages']
    }


# ============== Scheduler Endpoints ==============

class SchedulePaymentRequest(BaseModel):
    user_address: str
    recipient: str
    amount: str
    token: str = "USDC"
    schedule_type: str = "immediate"  # immediate, scheduled, recurring
    execute_at: Optional[str] = None  # ISO datetime for scheduled
    recurring_interval_seconds: Optional[int] = None  # For recurring


@app.post("/schedule/add")
async def add_scheduled_payment(request: SchedulePaymentRequest):
    """Add a scheduled or recurring payment"""
    payment_id = str(uuid.uuid4())
    
    payment = scheduler_runner.add_scheduled_payment(
        user_address=request.user_address,
        payment_id=payment_id,
        recipient=request.recipient,
        amount=request.amount,
        token=request.token,
        schedule_type=request.schedule_type,
        execute_at=request.execute_at,
        recurring_interval_seconds=request.recurring_interval_seconds
    )
    
    return {
        "payment_id": payment_id,
        "status": "scheduled",
        "payment": payment
    }


@app.get("/schedule/list/{user_address}")
async def list_scheduled_payments(user_address: str):
    """List all scheduled payments for a user"""
    payments = scheduler_runner.get_user_schedule(user_address)
    
    return {
        "user_address": user_address,
        "count": len(payments),
        "payments": payments
    }


@app.post("/schedule/check/{user_address}")
async def check_and_execute_scheduled(user_address: str):
    """Check and execute any due scheduled payments"""
    try:
        result = await scheduler_runner.check_and_execute(user_address)
        
        return {
            "user_address": user_address,
            "status": result['status'],
            "executed_count": len(result['pending_executions']),
            "messages": result['messages']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/schedule/cancel/{user_address}/{payment_id}")
async def cancel_scheduled_payment(user_address: str, payment_id: str):
    """Cancel a scheduled payment"""
    success = scheduler_runner.cancel_payment(user_address, payment_id)
    
    if success:
        return {"status": "cancelled", "payment_id": payment_id}
    
    raise HTTPException(status_code=404, detail="Payment not found or already executed")


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
