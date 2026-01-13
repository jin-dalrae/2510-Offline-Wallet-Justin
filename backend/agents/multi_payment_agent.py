"""
Multi-Step Payment Agent

This agent handles complex payment scenarios:
1. Multiple sequential payments
2. Batch payments to multiple recipients
3. Scheduled/recurring payments
4. Conditional payments (pay if certain conditions met)
"""

import asyncio
from typing import TypedDict, Optional, List, Dict, Any, Literal
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import json

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver


class PaymentScheduleType(str, Enum):
    IMMEDIATE = "immediate"
    SCHEDULED = "scheduled"
    RECURRING = "recurring"
    CONDITIONAL = "conditional"


@dataclass
class ScheduledPayment:
    """Represents a scheduled payment"""
    id: str
    recipient: str
    amount: str
    token: str
    schedule_type: PaymentScheduleType
    execute_at: Optional[datetime] = None
    recurring_interval: Optional[timedelta] = None
    condition: Optional[str] = None  # e.g., "balance > 100"
    status: str = "pending"
    last_executed: Optional[datetime] = None
    execution_count: int = 0


class MultiPaymentState(TypedDict):
    """State for multi-step payments"""
    session_id: str
    user_address: str
    
    # Payments to process
    payments: List[Dict[str, Any]]  # List of {recipient, amount, token, url?}
    current_index: int
    
    # Results
    completed_payments: List[Dict[str, Any]]
    failed_payments: List[Dict[str, Any]]
    
    # Status
    status: Literal["pending", "processing", "awaiting_approval", "completed", "failed", "paused"]
    requires_approval: bool
    total_amount: str
    
    # Messages
    messages: List[Dict[str, str]]
    error: Optional[str]


class SchedulerState(TypedDict):
    """State for payment scheduler"""
    user_address: str
    scheduled_payments: List[Dict[str, Any]]
    pending_executions: List[str]  # Payment IDs to execute
    
    status: Literal["idle", "checking", "executing", "completed"]
    messages: List[Dict[str, str]]
    error: Optional[str]


# ============== Multi-Payment Nodes ==============

async def prepare_batch_node(state: MultiPaymentState) -> MultiPaymentState:
    """Prepare batch payments and calculate totals"""
    if not state['payments']:
        state['error'] = "No payments provided"
        state['status'] = "failed"
        return state
    
    # Calculate total by token
    totals: Dict[str, float] = {}
    for payment in state['payments']:
        token = payment.get('token', 'USDC')
        amount = float(payment.get('amount', 0))
        totals[token] = totals.get(token, 0) + amount
    
    total_str = ", ".join([f"{amt:.2f} {tok}" for tok, amt in totals.items()])
    state['total_amount'] = total_str
    state['status'] = 'awaiting_approval'
    state['requires_approval'] = True
    
    state['messages'].append({
        'role': 'assistant',
        'content': f"Prepared {len(state['payments'])} payments totaling {total_str}. Awaiting approval."
    })
    
    return state


async def execute_batch_node(state: MultiPaymentState) -> MultiPaymentState:
    """Execute the batch payments one by one"""
    state['status'] = 'processing'
    
    for i, payment in enumerate(state['payments']):
        state['current_index'] = i
        
        # In real implementation, this would execute the blockchain transaction
        # For now, we just simulate and prepare the transaction data
        state['messages'].append({
            'role': 'system',
            'content': json.dumps({
                'action': 'EXECUTE_PAYMENT',
                'index': i,
                'payment': payment
            })
        })
        
        # Mark as completed (actual completion would be confirmed by frontend)
        payment_result = {
            **payment,
            'status': 'pending_confirmation',
            'timestamp': datetime.now().isoformat()
        }
        state['completed_payments'].append(payment_result)
    
    state['status'] = 'awaiting_approval'  # Wait for frontend confirmations
    return state


async def complete_batch_node(state: MultiPaymentState) -> MultiPaymentState:
    """Finalize the batch payment session"""
    successful = len([p for p in state['completed_payments'] if p.get('status') == 'confirmed'])
    failed = len(state['failed_payments'])
    
    if failed > 0:
        state['status'] = 'completed'  # Completed with some failures
        state['messages'].append({
            'role': 'assistant',
            'content': f"Batch complete: {successful} succeeded, {failed} failed."
        })
    else:
        state['status'] = 'completed'
        state['messages'].append({
            'role': 'assistant',
            'content': f"All {successful} payments completed successfully!"
        })
    
    return state


# ============== Scheduler Nodes ==============

async def check_schedule_node(state: SchedulerState) -> SchedulerState:
    """Check which scheduled payments are due"""
    state['status'] = 'checking'
    now = datetime.now()
    
    pending: List[str] = []
    
    for payment in state['scheduled_payments']:
        if payment['status'] != 'pending':
            continue
        
        schedule_type = payment.get('schedule_type', 'immediate')
        
        if schedule_type == PaymentScheduleType.IMMEDIATE.value:
            pending.append(payment['id'])
        
        elif schedule_type == PaymentScheduleType.SCHEDULED.value:
            execute_at = datetime.fromisoformat(payment.get('execute_at', ''))
            if now >= execute_at:
                pending.append(payment['id'])
        
        elif schedule_type == PaymentScheduleType.RECURRING.value:
            last_executed = payment.get('last_executed')
            interval_seconds = payment.get('recurring_interval_seconds', 86400)  # Default 24h
            
            if last_executed:
                last_dt = datetime.fromisoformat(last_executed)
                if (now - last_dt).total_seconds() >= interval_seconds:
                    pending.append(payment['id'])
            else:
                # Never executed, check start time
                execute_at = payment.get('execute_at')
                if execute_at and now >= datetime.fromisoformat(execute_at):
                    pending.append(payment['id'])
                elif not execute_at:
                    pending.append(payment['id'])  # Start immediately
    
    state['pending_executions'] = pending
    
    if pending:
        state['messages'].append({
            'role': 'assistant',
            'content': f"Found {len(pending)} scheduled payments ready for execution."
        })
    else:
        state['messages'].append({
            'role': 'assistant',
            'content': "No payments due at this time."
        })
    
    return state


async def execute_scheduled_node(state: SchedulerState) -> SchedulerState:
    """Execute pending scheduled payments"""
    state['status'] = 'executing'
    
    for payment_id in state['pending_executions']:
        # Find the payment
        payment = next((p for p in state['scheduled_payments'] if p['id'] == payment_id), None)
        if not payment:
            continue
        
        # Emit execution request
        state['messages'].append({
            'role': 'system',
            'content': json.dumps({
                'action': 'EXECUTE_SCHEDULED_PAYMENT',
                'payment_id': payment_id,
                'recipient': payment['recipient'],
                'amount': payment['amount'],
                'token': payment.get('token', 'USDC')
            })
        })
        
        # Update payment record
        payment['last_executed'] = datetime.now().isoformat()
        payment['execution_count'] = payment.get('execution_count', 0) + 1
        
        # For non-recurring, mark as completed
        if payment.get('schedule_type') != PaymentScheduleType.RECURRING.value:
            payment['status'] = 'executed'
    
    state['status'] = 'completed'
    return state


# ============== Graph Construction ==============

def create_multi_payment_agent() -> StateGraph:
    """Create multi-payment batch agent"""
    workflow = StateGraph(MultiPaymentState)
    
    workflow.add_node("prepare", prepare_batch_node)
    workflow.add_node("execute", execute_batch_node)
    workflow.add_node("complete", complete_batch_node)
    
    workflow.set_entry_point("prepare")
    workflow.add_edge("prepare", END)  # Wait for approval
    workflow.add_edge("execute", END)  # Wait for confirmations
    workflow.add_edge("complete", END)
    
    return workflow


def create_scheduler_agent() -> StateGraph:
    """Create payment scheduler agent"""
    workflow = StateGraph(SchedulerState)
    
    workflow.add_node("check", check_schedule_node)
    workflow.add_node("execute", execute_scheduled_node)
    
    workflow.set_entry_point("check")
    
    def should_execute(state: SchedulerState) -> str:
        if state['pending_executions']:
            return 'execute'
        return 'done'
    
    workflow.add_conditional_edges(
        "check",
        should_execute,
        {'execute': 'execute', 'done': END}
    )
    
    workflow.add_edge("execute", END)
    
    return workflow


# ============== Runners ==============

class MultiPaymentRunner:
    """Runner for batch payments"""
    
    def __init__(self):
        self.graph = create_multi_payment_agent()
        self.memory = MemorySaver()
        self.app = self.graph.compile(checkpointer=self.memory)
        self.sessions: Dict[str, MultiPaymentState] = {}
    
    async def start_batch(
        self,
        session_id: str,
        user_address: str,
        payments: List[Dict[str, Any]]
    ) -> MultiPaymentState:
        """Start a batch payment session"""
        initial_state: MultiPaymentState = {
            'session_id': session_id,
            'user_address': user_address,
            'payments': payments,
            'current_index': 0,
            'completed_payments': [],
            'failed_payments': [],
            'status': 'pending',
            'requires_approval': False,
            'total_amount': '',
            'messages': [{'role': 'assistant', 'content': 'Preparing batch payments...'}],
            'error': None
        }
        
        config = {"configurable": {"thread_id": session_id}}
        result = await self.app.ainvoke(initial_state, config)
        
        self.sessions[session_id] = result
        return result
    
    async def approve_and_execute(self, session_id: str) -> MultiPaymentState:
        """Approve batch and start execution"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        state = self.sessions[session_id]
        state['requires_approval'] = False
        
        # Execute
        result = await execute_batch_node(state)
        self.sessions[session_id] = result
        return result
    
    async def confirm_payment(
        self,
        session_id: str,
        payment_index: int,
        tx_hash: str,
        success: bool = True
    ) -> MultiPaymentState:
        """Confirm a payment was executed"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        state = self.sessions[session_id]
        
        if payment_index < len(state['completed_payments']):
            payment = state['completed_payments'][payment_index]
            if success:
                payment['status'] = 'confirmed'
                payment['tx_hash'] = tx_hash
            else:
                payment['status'] = 'failed'
                state['failed_payments'].append(payment)
        
        # Check if all payments are confirmed
        all_confirmed = all(
            p.get('status') in ['confirmed', 'failed']
            for p in state['completed_payments']
        )
        
        if all_confirmed:
            result = await complete_batch_node(state)
            self.sessions[session_id] = result
            return result
        
        return state
    
    def get_session(self, session_id: str) -> Optional[MultiPaymentState]:
        return self.sessions.get(session_id)


class SchedulerRunner:
    """Runner for scheduled payments"""
    
    def __init__(self):
        self.graph = create_scheduler_agent()
        self.memory = MemorySaver()
        self.app = self.graph.compile(checkpointer=self.memory)
        self.user_schedules: Dict[str, List[Dict[str, Any]]] = {}  # user_address -> payments
    
    def add_scheduled_payment(
        self,
        user_address: str,
        payment_id: str,
        recipient: str,
        amount: str,
        token: str = 'USDC',
        schedule_type: str = 'immediate',
        execute_at: Optional[str] = None,
        recurring_interval_seconds: Optional[int] = None
    ) -> Dict[str, Any]:
        """Add a new scheduled payment"""
        if user_address not in self.user_schedules:
            self.user_schedules[user_address] = []
        
        payment = {
            'id': payment_id,
            'recipient': recipient,
            'amount': amount,
            'token': token,
            'schedule_type': schedule_type,
            'execute_at': execute_at,
            'recurring_interval_seconds': recurring_interval_seconds,
            'status': 'pending',
            'last_executed': None,
            'execution_count': 0,
            'created_at': datetime.now().isoformat()
        }
        
        self.user_schedules[user_address].append(payment)
        return payment
    
    async def check_and_execute(self, user_address: str) -> SchedulerState:
        """Check and execute due payments for a user"""
        payments = self.user_schedules.get(user_address, [])
        
        initial_state: SchedulerState = {
            'user_address': user_address,
            'scheduled_payments': payments,
            'pending_executions': [],
            'status': 'idle',
            'messages': [],
            'error': None
        }
        
        config = {"configurable": {"thread_id": f"scheduler_{user_address}"}}
        result = await self.app.ainvoke(initial_state, config)
        
        # Update stored payments with execution results
        self.user_schedules[user_address] = result['scheduled_payments']
        
        return result
    
    def get_user_schedule(self, user_address: str) -> List[Dict[str, Any]]:
        return self.user_schedules.get(user_address, [])
    
    def cancel_payment(self, user_address: str, payment_id: str) -> bool:
        """Cancel a scheduled payment"""
        payments = self.user_schedules.get(user_address, [])
        for payment in payments:
            if payment['id'] == payment_id and payment['status'] == 'pending':
                payment['status'] = 'cancelled'
                return True
        return False


# Singleton instances
multi_payment_runner = MultiPaymentRunner()
scheduler_runner = SchedulerRunner()
