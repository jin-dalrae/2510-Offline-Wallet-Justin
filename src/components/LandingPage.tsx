

interface LandingPageProps {
    onSignUp: () => void;
    onSignIn: () => void;
    onPrivacy: () => void;
}

export function LandingPage({ onSignUp, onSignIn, onPrivacy }: LandingPageProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#eaff7b] to-[#4bf2e6] text-slate-800">
            <div className="max-w-md w-full space-y-12 animate-fade-in text-center">

                {/* Brand Section */}
                <div className="space-y-6">
                    <h1 className="text-7xl font-serif text-slate-800 tracking-tight">
                        justin
                    </h1>

                    <div className="space-y-4">
                        <h2 className="text-3xl font-zilla font-medium text-slate-800 leading-tight">
                            Let's reinvent Cash with Tech.
                        </h2>

                        <p className="font-sans text-lg text-slate-700 max-w-xs mx-auto leading-relaxed">
                            Fast. Easy. Anonymous. Trusted.<br />
                            It's simply paying and giving,<br />
                            the way it used to be.
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4 pt-8">
                    <button
                        onClick={onSignUp}
                        className="w-full bg-slate-900 text-white font-sans font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95"
                    >
                        Get Started
                    </button>

                    <button
                        onClick={onSignIn}
                        className="w-full bg-white/50 backdrop-blur-sm text-slate-900 font-sans font-bold text-lg py-4 rounded-2xl border-2 border-slate-900/10 hover:bg-white/80 hover:scale-[1.02] transition-all active:scale-95"
                    >
                        I have a wallet
                    </button>
                </div>

                {/* Footer */}
                <div className="text-sm font-sans text-slate-600 opacity-80 space-y-2">
                    <p>Non-custodial • Base Sepolia Testnet</p>
                    <button
                        onClick={onPrivacy}
                        className="underline hover:text-slate-900 transition-colors"
                    >
                        Privacy Policy & User Agreement
                    </button>
                </div>
            </div>
        </div>
    );
}
