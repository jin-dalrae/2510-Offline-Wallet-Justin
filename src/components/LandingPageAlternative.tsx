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
        <div className="min-h-screen bg-gradient-to-b from-[#eaff7b] to-[#4bf2e6] font-sans text-slate-900 selection:bg-slate-900 selection:text-white">

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-xl py-4 shadow-lg' : 'bg-transparent py-6'
                }`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <button
                        onClick={() => scrollToSection('hero')}
                        className="text-3xl md:text-4xl font-serif font-black tracking-tighter transition-colors text-slate-900"
                    >
                        justin
                    </button>

                    <div className="hidden md:flex items-center gap-8 text-sm font-bold tracking-wide uppercase text-slate-700">
                        <button onClick={() => scrollToSection('vision')} className="hover:text-slate-900 transition-colors">Vision</button>
                        <button onClick={() => scrollToSection('technology')} className="hover:text-slate-900 transition-colors">Technology</button>
                        <button onClick={() => scrollToSection('security')} className="hover:text-slate-900 transition-colors">Security</button>
                        <button onClick={() => scrollToSection('team')} className="hover:text-slate-900 transition-colors">Team</button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onSignIn}
                            className="text-sm font-bold hover:text-slate-900 transition-colors text-slate-700"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={onSignUp}
                            className="bg-[#1e3a5f] text-white text-sm font-bold px-6 py-3 rounded-full hover:bg-[#2d4a6f] hover:shadow-lg hover:-translate-y-0.5 transition-all"
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
                                className="px-8 py-4 bg-[#1e3a5f] text-white rounded-2xl font-bold text-lg hover:bg-[#2d4a6f] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2"
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
                                    <div className="w-12 h-12 bg-[#1e3a5f] rounded-2xl flex items-center justify-center text-2xl">⚡️</div>
                                    <div className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">Active</div>
                                </div>
                                <div className="space-y-4 mb-8">
                                    <div className="h-4 bg-slate-200/50 rounded-full w-2/3" />
                                    <div className="h-4 bg-slate-200/50 rounded-full w-1/2" />
                                </div>
                                <div className="p-6 bg-[#1e3a5f] rounded-3xl text-white">
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
                            <div key={i} className="group p-8 rounded-[2rem] bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 shadow-lg hover:shadow-xl">
                                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                                <h3 className="text-2xl font-bold mb-4 text-slate-900">{item.title}</h3>
                                <p className="text-slate-700 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tech Section */}
            <section id="technology" className="py-24 bg-[#1e3a5f] text-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8">Powered by <br /><span className="text-[#4bf2e6]">Advanced Cryptography</span></h2>
                            <div className="space-y-8">
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-xl bg-[#4bf2e6]/20 flex items-center justify-center text-[#4bf2e6] font-bold text-xl shrink-0">01</div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">Zero-Knowledge Proofs</h3>
                                        <p className="text-slate-400">Verifying transactions without revealing sensitive data, ensuring privacy at every step.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-xl bg-[#4bf2e6]/20 flex items-center justify-center text-[#4bf2e6] font-bold text-xl shrink-0">02</div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">Local Settlement</h3>
                                        <p className="text-slate-400">Transactions are signed locally and settled on-chain only when you reconnect.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-xl bg-[#4bf2e6]/20 flex items-center justify-center text-[#4bf2e6] font-bold text-xl shrink-0">03</div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">Smart Account Abstraction</h3>
                                        <p className="text-slate-400">Recovery, batching, and gas sponsorship built-in. The complexity is hidden.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#4bf2e6]/20 blur-3xl rounded-full" />
                            <div className="relative bg-[#2d4a6f] p-8 rounded-3xl border border-[#3d5a7f]">
                                <pre className="font-mono text-sm text-[#4bf2e6] overflow-x-auto">
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

            {/* Security Section */}
            <section id="security" className="py-24 bg-white/60 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-6">
                            Bank-Grade Security
                        </h2>
                        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                            Your financial security is our top priority. We implement multiple layers of protection to keep your assets safe.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                        {[
                            {
                                icon: "🔐",
                                title: "End-to-End Encryption",
                                desc: "All private keys are encrypted locally using AES-256 encryption before storage. Your keys never leave your device unencrypted."
                            },
                            {
                                icon: "🔑",
                                title: "Non-Custodial",
                                desc: "You own your keys, you own your funds. We never have access to your private keys or funds at any time."
                            },
                            {
                                icon: "🛡️",
                                title: "Signature Verification",
                                desc: "Every voucher is cryptographically signed and verified to prevent tampering and ensure authenticity."
                            },
                            {
                                icon: "👤",
                                title: "Receiver-Specific",
                                desc: "Vouchers are locked to specific recipient addresses, preventing unauthorized claims even if intercepted."
                            },
                            {
                                icon: "⏱️",
                                title: "Time-Bound Vouchers",
                                desc: "All vouchers automatically expire after 7 days, reducing the window of opportunity for potential attacks."
                            },
                            {
                                icon: "🔍",
                                title: "Open Source & Auditable",
                                desc: "Our code is open source and available for community review. Transparency builds trust."
                            }
                        ].map((item, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all">
                                <div className="text-5xl mb-4">{item.icon}</div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] rounded-3xl p-8 md:p-12 text-white">
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div>
                                <h3 className="text-3xl font-bold mb-4">Security Best Practices</h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <span className="text-[#4bf2e6] text-2xl">✓</span>
                                        <div>
                                            <strong className="block mb-1">Strong Password Required</strong>
                                            <span className="text-slate-300">Minimum 8 characters with complexity requirements</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-[#4bf2e6] text-2xl">✓</span>
                                        <div>
                                            <strong className="block mb-1">Backup Your Recovery Phrase</strong>
                                            <span className="text-slate-300">12-word mnemonic provides wallet recovery access</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-[#4bf2e6] text-2xl">✓</span>
                                        <div>
                                            <strong className="block mb-1">Device-Specific Balances</strong>
                                            <span className="text-slate-300">Prevents double-spending in offline scenarios</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-[#4bf2e6] text-2xl">✓</span>
                                        <div>
                                            <strong className="block mb-1">On-Chain Settlement</strong>
                                            <span className="text-slate-300">All transactions ultimately settle on Base Sepolia blockchain</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-[#2d4a6f] rounded-2xl p-6 border border-[#3d5a7f]">
                                <div className="text-center mb-4">
                                    <div className="inline-block p-4 bg-[#4bf2e6]/20 rounded-full mb-4">
                                        <svg className="w-12 h-12 text-[#4bf2e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-xl font-bold mb-2">Security Notice</h4>
                                </div>
                                <div className="space-y-3 text-sm text-slate-300">
                                    <p>⚠️ This is experimental software for testing on Base Sepolia testnet only.</p>
                                    <p>🔒 Never use this with real funds or on mainnet.</p>
                                    <p>📝 Always backup your recovery phrase securely.</p>
                                    <p>🔐 Code is not yet audited - use at your own risk.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section id="team" className="py-24 bg-gradient-to-b from-[#1e3a5f] to-[#2d4a6f] text-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
                            Built by Innovators
                        </h2>
                        <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                            A passionate team dedicated to making financial freedom accessible to everyone, everywhere.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-3xl mx-auto">
                        {[
                            {
                                name: "Rae Jin",
                                role: "CEO, Developer",
                                bio: "Visionary leader passionate about making financial freedom accessible through innovative blockchain solutions.",
                                avatar: "👩‍💻"
                            },
                            {
                                name: "Danny Shin",
                                role: "Developer/Design Lead",
                                bio: "Full-stack developer and design expert crafting intuitive experiences for the next generation of payments.",
                                avatar: "👨‍🎨"
                            }
                        ].map((member, i) => (
                            <div key={i} className="group">
                                <div className="bg-[#2d4a6f] rounded-3xl p-8 text-center hover:bg-[#3d5a7f] transition-all hover:scale-105">
                                    <div className="text-8xl mb-6">{member.avatar}</div>
                                    <h3 className="text-2xl font-bold mb-3">{member.name}</h3>
                                    <p className="text-[#4bf2e6] font-semibold text-lg mb-4">{member.role}</p>
                                    <p className="text-slate-400 leading-relaxed">{member.bio}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-[#1e3a5f] text-white text-center">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-4xl md:text-6xl font-serif font-bold mb-8">Ready to break free?</h2>
                    <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
                        Join thousands of users who have already switched to the future of payments. Secure, fast, and truly yours.
                    </p>
                    <button
                        onClick={onSignUp}
                        className="px-10 py-5 bg-gradient-to-r from-[#eaff7b] to-[#4bf2e6] text-slate-900 rounded-full font-bold text-xl hover:shadow-2xl transition-all hover:scale-105"
                    >
                        Get Started Now
                    </button>
                    <p className="mt-8 text-sm text-slate-400">No credit card required • Open Source • Secure</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#1e3a5f] py-12 border-t border-[#2d4a6f]">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-3xl font-serif font-bold text-white">justin</div>
                    <div className="flex gap-8 text-sm font-medium text-slate-400">
                        <a href="#" className="hover:text-[#4bf2e6] transition-colors">Terms</a>
                        <button onClick={onPrivacy} className="hover:text-[#4bf2e6] transition-colors">Privacy</button>
                        <a href="#" className="hover:text-[#4bf2e6] transition-colors">Contact</a>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#4bf2e6] transition-colors">GitHub</a>
                    </div>
                    <p className="text-sm text-slate-500">© 2024 Justin Payments. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
