import { useState, useEffect } from 'react';

interface LandingPageProps {
    onSignUp: () => void;
    onSignIn: () => void;
    onPrivacy: () => void;
    onTryDemo: () => void;
}

export function LandingPageAlternative({ onSignUp, onSignIn, onPrivacy, onTryDemo }: LandingPageProps) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-md py-4 shadow-sm' : 'bg-transparent py-6'
                }`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <button
                        onClick={() => scrollToSection('hero')}
                        className={`text-2xl font-serif font-black tracking-tighter transition-colors ${scrolled ? 'text-indigo-600' : 'text-slate-900'}`}
                    >
                        justin.
                    </button>

                    <div className={`hidden md:flex items-center gap-8 text-sm font-bold tracking-wide uppercase ${scrolled ? 'text-slate-500' : 'text-slate-600'}`}>
                        <button onClick={() => scrollToSection('vision')} className="hover:text-indigo-600 transition-colors">Vision</button>
                        <button onClick={() => scrollToSection('technology')} className="hover:text-indigo-600 transition-colors">Technology</button>
                        <button onClick={() => scrollToSection('security')} className="hover:text-indigo-600 transition-colors">Security</button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onSignIn}
                            className={`text-sm font-bold hover:text-indigo-600 transition-colors hidden sm:block ${scrolled ? 'text-slate-900' : 'text-slate-900'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={onSignUp}
                            className="bg-indigo-600 text-white text-sm font-bold px-6 py-3 rounded-full hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                            Start Now
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="hero" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Gradient Background matching the file */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#eaff7b] to-[#4bf2e6] -z-10" />

                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/30 backdrop-blur-md text-slate-900 text-xs font-bold uppercase tracking-wider border border-white/20">
                            <span className="w-2 h-2 rounded-full bg-slate-900 animate-pulse" />
                            The Future of Payments
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-serif font-bold leading-tight text-slate-900">
                            Let's reinvent <br />
                            Cash with Tech.
                        </h1>

                        <div className="space-y-4">
                            <p className="text-xl md:text-2xl font-bold text-slate-800">
                                Fast. Easy. Anonymous. Trusted.
                            </p>
                            <p className="text-xl text-slate-700 max-w-lg leading-relaxed">
                                it's simply paying and giving, <br />
                                the way it used to be.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                onClick={onSignUp}
                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2"
                            >
                                Create Wallet
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </button>
                            <button
                                onClick={onTryDemo}
                                className="px-8 py-4 bg-white/50 backdrop-blur-sm text-slate-900 border-2 border-white/50 rounded-2xl font-bold text-lg hover:bg-white hover:border-white transition-all flex items-center justify-center gap-2"
                            >
                                Try Demo
                            </button>
                        </div>
                    </div>

                    <div className="relative lg:h-[600px] flex items-center justify-center">
                        {/* Abstract Visual */}
                        <div className="relative w-full max-w-md aspect-square">
                            <div className="absolute inset-0 bg-white/20 rounded-full opacity-50 blur-3xl animate-pulse-slow" />
                            <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 p-8 rounded-[3rem] shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-2xl">⚡️</div>
                                    <div className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">Active</div>
                                </div>
                                <div className="space-y-4 mb-8">
                                    <div className="h-4 bg-slate-200/50 rounded-full w-2/3" />
                                    <div className="h-4 bg-slate-200/50 rounded-full w-1/2" />
                                </div>
                                <div className="p-6 bg-slate-900 rounded-3xl text-white">
                                    <p className="text-sm text-slate-400 mb-1">Total Balance</p>
                                    <p className="text-4xl font-mono font-bold">$12,450.00</p>
                                </div>
                            </div>

                            {/* Floating Element */}
                            <div className="absolute -bottom-12 -left-12 bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/50 animate-float">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Payment Received</p>
                                        <p className="text-sm text-slate-500">Just now • Offline</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Vision Section */}
            <section id="vision" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="max-w-3xl mx-auto text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-slate-900">Reimagining Value Transfer</h2>
                        <p className="text-xl text-slate-600 leading-relaxed">
                            We believe money should be as fluid as information. Instant, global, and accessible to everyone, everywhere. Even without the internet.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "True Ownership",
                                desc: "Your keys, your crypto. Non-custodial by design, giving you complete control over your assets.",
                                icon: "🔐"
                            },
                            {
                                title: "Offline First",
                                desc: "Transact anywhere. Our proprietary voucher system enables secure peer-to-peer payments without connectivity.",
                                icon: "📡"
                            },
                            {
                                title: "Universal Access",
                                desc: "Built on Base. Low fees, high speed, and compatible with the entire Ethereum ecosystem.",
                                icon: "🌍"
                            }
                        ].map((item, i) => (
                            <div key={i} className="group p-8 rounded-[2rem] bg-slate-50 hover:bg-indigo-50 transition-colors duration-300">
                                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                                <h3 className="text-2xl font-bold mb-4 text-slate-900">{item.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tech Section */}
            <section id="technology" className="py-24 bg-slate-900 text-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8">Powered by <br /><span className="text-indigo-400">Advanced Cryptography</span></h2>
                            <div className="space-y-8">
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl shrink-0">01</div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">Zero-Knowledge Proofs</h3>
                                        <p className="text-slate-400">Verifying transactions without revealing sensitive data, ensuring privacy at every step.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl shrink-0">02</div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">Local Settlement</h3>
                                        <p className="text-slate-400">Transactions are signed locally and settled on-chain only when you reconnect.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl shrink-0">03</div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">Smart Account Abstraction</h3>
                                        <p className="text-slate-400">Recovery, batching, and gas sponsorship built-in. The complexity is hidden.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full" />
                            <div className="relative bg-slate-800 p-8 rounded-3xl border border-slate-700">
                                <pre className="font-mono text-sm text-indigo-300 overflow-x-auto">
                                    <code>{`
// Secure Offline Transfer
async function transfer(amount, recipient) {
  const voucher = await createVoucher({
    amount: amount,
    to: recipient,
    nonce: generateNonce()
  });
  
  const signature = await sign(voucher);
  return encodeQR({ ...voucher, signature });
}
                  `}</code>
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-indigo-600 text-white text-center">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-4xl md:text-6xl font-serif font-bold mb-8">Ready to break free?</h2>
                    <p className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto">
                        Join thousands of users who have already switched to the future of payments. Secure, fast, and truly yours.
                    </p>
                    <button
                        onClick={onSignUp}
                        className="px-10 py-5 bg-white text-indigo-600 rounded-full font-bold text-xl hover:bg-indigo-50 transition-all shadow-xl hover:scale-105"
                    >
                        Get Started Now
                    </button>
                    <p className="mt-8 text-sm text-indigo-200">No credit card required • Open Source • Secure</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-50 py-12 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-2xl font-serif font-bold text-slate-900">justin.</div>
                    <div className="flex gap-8 text-sm font-medium text-slate-600">
                        <a href="#" className="hover:text-indigo-600">Terms</a>
                        <button onClick={onPrivacy} className="hover:text-indigo-600">Privacy</button>
                        <a href="#" className="hover:text-indigo-600">Contact</a>
                    </div>
                    <p className="text-sm text-slate-400">© 2024 Justin Payments. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
