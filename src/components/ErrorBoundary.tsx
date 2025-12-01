import { Component, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        toast.error('Something went wrong. Please try again.');
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-gradient-to-b from-[#eaff7b] to-[#4bf2e6] flex items-center justify-center p-6">
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl max-w-md w-full text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg
                                className="w-10 h-10 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-900 mb-4">
                            Oops! Something went wrong
                        </h2>

                        <p className="text-slate-600 mb-6">
                            We encountered an unexpected error. Don't worry, your wallet is safe.
                        </p>

                        {this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                                    Technical details
                                </summary>
                                <pre className="mt-2 p-4 bg-slate-100 rounded-xl text-xs text-slate-700 overflow-auto">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}

                        <button
                            onClick={this.handleReset}
                            className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95"
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
