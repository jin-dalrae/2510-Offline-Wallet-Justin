import { useState } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

interface SignUpProps {
    onComplete: (accountName: string, privateKey: string) => void;
    onBack: () => void;
    onPrivacy: () => void;
}

export function SignUp({ onComplete, onBack, onPrivacy }: SignUpProps) {
    const [accountName, setAccountName] = useState('');
    const [step, setStep] = useState<'name' | 'keys'>('name');
    const [generatedPrivateKey, setGeneratedPrivateKey] = useState('');
    const [copied, setCopied] = useState(false);

    const [agreed, setAgreed] = useState(false);

    const handleGenerateWallet = () => {
        if (!accountName.trim()) {
            toast.error('Please enter an account name');
            return;
        }

        if (!agreed) {
            toast.error('Please agree to the Terms & Privacy Policy');
            return;
        }

        // Generate wallet with mnemonic
        const wallet = ethers.Wallet.createRandom();

        // Store mnemonic for display
        setGeneratedPrivateKey(wallet.mnemonic?.phrase || '');
        setStep('keys');
    };

    const handleCopyKey = async () => {
        try {
            await navigator.clipboard.writeText(generatedPrivateKey);
            setCopied(true);
            toast.success('Private key copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    const handleContinue = () => {
        try {
            // Derive private key from mnemonic
            const wallet = ethers.Wallet.fromPhrase(generatedPrivateKey);
            onComplete(accountName, wallet.privateKey);
        } catch (error) {
            toast.error('Error creating wallet from phrase');
            console.error(error);
        }
    };

    if (step === 'name') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#eaff7b] to-[#4bf2e6] text-slate-800 font-sans">
                <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl animate-fade-in">
                    <button
                        onClick={onBack}
                        className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>

                    <h2 className="text-3xl font-serif font-bold mb-2 text-slate-900">Create Account</h2>
                    <p className="text-slate-500 mb-8 font-sans">Choose a name for your wallet.</p>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Account Name</label>
                            <input
                                type="text"
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-slate-900 focus:ring-0 outline-none transition-all font-medium text-lg placeholder:text-slate-300"
                                placeholder="e.g. Justin Fan"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <input
                                type="checkbox"
                                id="agreement"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded-lg border-2 border-slate-300 text-slate-900 focus:ring-slate-900 transition-all cursor-pointer"
                            />
                            <label htmlFor="agreement" className="text-sm text-slate-600 leading-relaxed cursor-pointer select-none">
                                I agree to the{' '}
                                <button onClick={onPrivacy} className="text-slate-900 font-bold hover:underline">
                                    User Agreement
                                </button>
                                {' '}and{' '}
                                <button onClick={onPrivacy} className="text-slate-900 font-bold hover:underline">
                                    Privacy Policy
                                </button>
                            </label>
                        </div>

                        <button
                            onClick={handleGenerateWallet}
                            disabled={!accountName.trim() || !agreed}
                            className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans">
            <div className="max-w-md w-full space-y-8 animate-slide-up">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-serif font-bold text-slate-900">Save Your Key</h2>
                    <p className="text-slate-500">This is the ONLY way to access your funds.</p>
                </div>

                {/* Mnemonic Display */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#eaff7b] to-[#4bf2e6]" />

                    <label className="block text-sm font-bold text-slate-700 mb-4 flex justify-between items-center">
                        <span>Recovery Phrase (12 Words)</span>
                        <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Keep Secret</span>
                    </label>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {generatedPrivateKey.split(' ').map((word, i) => (
                            <div key={i} className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                <span className="text-slate-300 text-[10px] block mb-0.5 font-mono">{i + 1}</span>
                                <span className="text-slate-700 font-medium text-sm">{word}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleCopyKey}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${copied
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                    >
                        {copied ? (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copied to Clipboard
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                Copy Phrase
                            </>
                        )}
                    </button>
                </div>

                {/* Warning */}
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex gap-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex-shrink-0 flex items-center justify-center text-red-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-red-900 mb-1">Do not lose this phrase!</h4>
                        <p className="text-sm text-red-700/80 leading-relaxed">
                            We cannot recover your funds if you lose these words. Write them down and store them safely.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleContinue}
                    className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-xl hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95"
                >
                    I've Written It Down
                </button>
            </div>
        </div>
    );
}
