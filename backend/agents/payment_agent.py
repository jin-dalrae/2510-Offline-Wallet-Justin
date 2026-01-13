"""
LangGraph Payment Agent for Justin Wallet

This module implements an autonomous AI agent that can:
1. Check URLs for x402 payment requirements
2. Negotiate payment terms
3. Execute payments with user approval
4. Handle multi-step payment flows
"""

import os
from typing import TypedDict, Annotated, Literal, Optional, List, Dict, Any
from datetime import datetime
import json
import httpx

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage


# ============== State Definitions ==============

class PaymentRequest(TypedDict):
    """Structure for x402 payment request"""
    url: str
    amount: str
    token: str
    receiver: str
    realm: Optional[str]


class AgentState(TypedDict):
    """State maintained throughout the agent's execution"""
    # Session info
    session_id: str
    user_address: str
    
    # Current task
    task_type: Literal["check_url", "negotiate", "pay", "multi_pay"]
    target_url: str
    
    # Payment discovery
    requires_payment: bool
    payment_request: Optional[PaymentRequest]
    content: Optional[str]
    
    # Negotiation
    negotiation_history: List[Dict[str, Any]]
    proposed_amount: Optional[str]
    counter_offer: Optional[str]
    
    # Execution
    user_approved: bool
    tx_hash: Optional[str]
    status: Literal["pending", "checking", "awaiting_approval", "executing", "completed", "failed", "negotiating"]
    error: Optional[str]
    
    # Messages
    messages: List[Dict[str, str]]


# ============== Tools ==============

async def check_x402_url(url: str) -> Dict[str, Any]:
    """Check if a URL requires x402 payment"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, follow_redirects=True)
            
            if response.status_code == 402:
                # Parse payment details from headers
                www_auth = response.headers.get('WWW-Authenticate', '')
                accept_payment = response.headers.get('Accept-Payment', '')
                payment_amount = response.headers.get('Payment-Amount', '')
                
                # Parse headers
                amount = ''
                token = 'USDC'
                receiver = ''
                realm = 'Access to resource'
                
                # Parse WWW-Authenticate header
                if www_auth.lower().startswith('x402'):
                    parts = www_auth[5:].split(',')
                    for part in parts:
                        if '=' in part:
                            key, val = part.strip().split('=', 1)
                            val = val.strip('"\'')
                            if key == 'amount':
                                amount = val
                            elif key == 'token':
                                token = val
                            elif key == 'receiver':
                                receiver = val
                            elif key == 'realm':
                                realm = val
                
                # Fallback to other headers
                if payment_amount:
                    for p in payment_amount.split():
                        if '=' in p:
                            k, v = p.split('=')
                            if k == 'amount':
                                amount = v
                            elif k == 'currency':
                                token = v
                
                if accept_payment:
                    import re
                    match = re.search(r'address=([^;,\s]+)', accept_payment)
                    if match:
                        receiver = match.group(1)
                
                # Try JSON body as fallback
                if not amount or not receiver:
                    try:
                        data = response.json()
                        amount = amount or data.get('amount', '')
                        receiver = receiver or data.get('receiver', data.get('address', ''))
                        token = token or data.get('token', 'USDC')
                    except:
                        pass
                
                if amount and receiver:
                    return {
                        'requires_payment': True,
                        'payment_request': {
                            'url': url,
                            'amount': amount,
                            'token': token,
                            'receiver': receiver,
                            'realm': realm
                        }
                    }
                else:
                    return {
                        'requires_payment': True,
                        'error': 'Could not parse payment details from 402 response'
                    }
            
            elif response.status_code == 200:
                return {
                    'requires_payment': False,
                    'content': response.text[:5000]  # Limit content size
                }
            
            else:
                return {
                    'requires_payment': False,
                    'error': f'Request failed with status {response.status_code}'
                }
                
        except Exception as e:
            return {
                'requires_payment': False,
                'error': str(e)
            }


# ============== Graph Nodes ==============

async def check_url_node(state: AgentState) -> AgentState:
    """Node that checks if URL requires payment"""
    result = await check_x402_url(state['target_url'])
    
    state['requires_payment'] = result.get('requires_payment', False)
    state['payment_request'] = result.get('payment_request')
    state['content'] = result.get('content')
    
    if result.get('error'):
        state['error'] = result['error']
        state['status'] = 'failed'
    elif state['requires_payment']:
        state['status'] = 'awaiting_approval'
        state['messages'].append({
            'role': 'assistant',
            'content': f"This URL requires payment: {state['payment_request']['amount']} {state['payment_request']['token']} to access '{state['payment_request'].get('realm', 'content')}'."
        })
    else:
        state['status'] = 'completed'
        state['messages'].append({
            'role': 'assistant',
            'content': 'This URL is freely accessible. No payment required.'
        })
    
    return state


async def negotiate_node(state: AgentState) -> AgentState:
    """Node that handles price negotiation (for compatible endpoints)"""
    # This would use LLM to negotiate with the server if it supports negotiation
    # For now, we just record the attempt
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
    
    payment = state['payment_request']
    if not payment:
        state['error'] = 'No payment request to negotiate'
        state['status'] = 'failed'
        return state
    
    # Create negotiation prompt
    messages = [
        SystemMessage(content="""You are a payment negotiation agent. 
Your goal is to negotiate the best price for accessing content.
Be polite but firm. Start by acknowledging the price and proposing a counter-offer if appropriate.
If the price seems reasonable, recommend approval."""),
        HumanMessage(content=f"""
The server is requesting:
- Amount: {payment['amount']} {payment['token']}
- For: {payment.get('realm', 'content access')}
- Receiver: {payment['receiver']}

Previous negotiation history: {json.dumps(state['negotiation_history'])}

Should we negotiate, or is this price acceptable? Provide your recommendation.
""")
    ]
    
    response = await llm.ainvoke(messages)
    
    state['negotiation_history'].append({
        'timestamp': datetime.now().isoformat(),
        'original_amount': payment['amount'],
        'agent_response': response.content
    })
    
    state['messages'].append({
        'role': 'assistant',
        'content': f"Negotiation analysis: {response.content}"
    })
    
    # For now, return to awaiting approval
    state['status'] = 'awaiting_approval'
    
    return state


async def execute_payment_node(state: AgentState) -> AgentState:
    """Node that executes the payment (requires user approval first)"""
    if not state['user_approved']:
        state['error'] = 'User approval required before execution'
        state['status'] = 'awaiting_approval'
        return state
    
    payment = state['payment_request']
    if not payment:
        state['error'] = 'No payment request to execute'
        state['status'] = 'failed'
        return state
    
    state['status'] = 'executing'
    state['messages'].append({
        'role': 'assistant',
        'content': f"Executing payment of {payment['amount']} {payment['token']} to {payment['receiver'][:10]}..."
    })
    
    # The actual payment execution happens on the frontend
    # This node just prepares the transaction data
    state['messages'].append({
        'role': 'system',
        'content': json.dumps({
            'action': 'EXECUTE_PAYMENT',
            'payment': payment
        })
    })
    
    return state


async def complete_node(state: AgentState) -> AgentState:
    """Node that marks the session as complete"""
    if state['status'] != 'failed':
        state['status'] = 'completed'
    
    if state['tx_hash']:
        state['messages'].append({
            'role': 'assistant',
            'content': f"Payment completed! Transaction hash: {state['tx_hash']}"
        })
    
    return state


# ============== Edge Logic ==============

def should_negotiate(state: AgentState) -> str:
    """Determine if we should negotiate or proceed to approval"""
    if state.get('error'):
        return 'complete'
    
    if not state.get('requires_payment'):
        return 'complete'
    
    # If this is a negotiate task and we haven't negotiated yet
    if state['task_type'] == 'negotiate' and len(state.get('negotiation_history', [])) == 0:
        return 'negotiate'
    
    return 'await_approval'


def check_approval(state: AgentState) -> str:
    """Check if user has approved the payment"""
    if state.get('error'):
        return 'complete'
    
    if state.get('user_approved'):
        return 'execute'
    
    return 'wait'  # Stay in awaiting state


# ============== Graph Construction ==============

def create_payment_agent() -> StateGraph:
    """Create the LangGraph payment agent"""
    
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("check_url", check_url_node)
    workflow.add_node("negotiate", negotiate_node)
    workflow.add_node("execute", execute_payment_node)
    workflow.add_node("complete", complete_node)
    
    # Add edges
    workflow.set_entry_point("check_url")
    
    workflow.add_conditional_edges(
        "check_url",
        should_negotiate,
        {
            'negotiate': 'negotiate',
            'await_approval': END,  # Await user input
            'complete': 'complete'
        }
    )
    
    workflow.add_edge("negotiate", END)  # Return to await approval
    workflow.add_edge("execute", "complete")
    workflow.add_edge("complete", END)
    
    return workflow


# ============== Agent Runner ==============

class PaymentAgentRunner:
    """Runner class for the payment agent"""
    
    def __init__(self):
        self.graph = create_payment_agent()
        self.memory = MemorySaver()
        self.app = self.graph.compile(checkpointer=self.memory)
        self.sessions: Dict[str, AgentState] = {}
    
    async def start_session(
        self,
        session_id: str,
        user_address: str,
        target_url: str,
        task_type: Literal["check_url", "negotiate", "pay"] = "check_url"
    ) -> AgentState:
        """Start a new agent session"""
        
        initial_state: AgentState = {
            'session_id': session_id,
            'user_address': user_address,
            'task_type': task_type,
            'target_url': target_url,
            'requires_payment': False,
            'payment_request': None,
            'content': None,
            'negotiation_history': [],
            'proposed_amount': None,
            'counter_offer': None,
            'user_approved': False,
            'tx_hash': None,
            'status': 'checking',
            'error': None,
            'messages': [{
                'role': 'assistant',
                'content': f'Starting analysis of {target_url}...'
            }]
        }
        
        config = {"configurable": {"thread_id": session_id}}
        
        # Run the graph until it needs user input
        result = await self.app.ainvoke(initial_state, config)
        
        self.sessions[session_id] = result
        return result
    
    async def approve_payment(self, session_id: str) -> AgentState:
        """User approves the payment"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        state = self.sessions[session_id]
        state['user_approved'] = True
        state['status'] = 'executing'
        
        config = {"configurable": {"thread_id": session_id}}
        
        # Continue execution
        result = await self.app.ainvoke(state, config, resume_from="execute")
        
        self.sessions[session_id] = result
        return result
    
    async def confirm_transaction(self, session_id: str, tx_hash: str) -> AgentState:
        """Confirm that the transaction was executed"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        state = self.sessions[session_id]
        state['tx_hash'] = tx_hash
        state['status'] = 'completed'
        state['messages'].append({
            'role': 'assistant',
            'content': f'Payment confirmed! Transaction: {tx_hash}'
        })
        
        self.sessions[session_id] = state
        return state
    
    def get_session(self, session_id: str) -> Optional[AgentState]:
        """Get the current state of a session"""
        return self.sessions.get(session_id)


# Singleton instance
agent_runner = PaymentAgentRunner()
