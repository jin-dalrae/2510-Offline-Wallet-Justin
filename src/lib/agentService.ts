/**
 * Agent Service - Frontend integration for LangGraph Payment Agent
 * 
 * This service connects to the Python backend to use AI-powered
 * payment agents for x402 protocol interactions.
 */

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';

export interface PaymentRequest {
    url: string;
    amount: string;
    token: string;
    receiver: string;
    realm?: string;
}

export interface AgentMessage {
    role: 'assistant' | 'user' | 'system';
    content: string;
}

export interface AgentSession {
    session_id: string;
    status: 'pending' | 'checking' | 'awaiting_approval' | 'executing' | 'completed' | 'failed' | 'negotiating';
    requires_payment: boolean;
    payment_request?: PaymentRequest;
    content?: string;
    tx_hash?: string;
    error?: string;
    messages: AgentMessage[];
}

export class AgentService {
    private baseUrl: string;

    constructor(baseUrl: string = AGENT_API_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Check if the agent backend is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Start a new agent session to analyze a URL
     */
    async startSession(
        userAddress: string,
        targetUrl: string,
        taskType: 'check_url' | 'negotiate' | 'pay' = 'check_url'
    ): Promise<AgentSession> {
        const response = await fetch(`${this.baseUrl}/agent/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_address: userAddress,
                target_url: targetUrl,
                task_type: taskType
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to start agent session');
        }

        return response.json();
    }

    /**
     * Get the current status of an agent session
     */
    async getSessionStatus(sessionId: string): Promise<AgentSession> {
        const response = await fetch(`${this.baseUrl}/agent/status/${sessionId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get session status');
        }

        return response.json();
    }

    /**
     * Approve a pending payment
     */
    async approvePayment(sessionId: string): Promise<AgentSession> {
        const response = await fetch(`${this.baseUrl}/agent/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to approve payment');
        }

        return response.json();
    }

    /**
     * Confirm that a transaction was executed
     */
    async confirmTransaction(sessionId: string, txHash: string): Promise<AgentSession> {
        const response = await fetch(`${this.baseUrl}/agent/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                tx_hash: txHash
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to confirm transaction');
        }

        return response.json();
    }

    /**
     * Request the agent to negotiate payment terms
     */
    async negotiate(sessionId: string, counterOffer?: string): Promise<AgentSession> {
        const response = await fetch(`${this.baseUrl}/agent/negotiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                counter_offer: counterOffer
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to negotiate');
        }

        return response.json();
    }

    /**
     * Cancel an agent session
     */
    async cancelSession(sessionId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/agent/session/${sessionId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to cancel session');
        }
    }
}

// Singleton instance
export const agentService = new AgentService();
