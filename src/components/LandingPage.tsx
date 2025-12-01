interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
  onPrivacy: () => void;
  onTryDemo?: () => void;
}

import { useState, useEffect } from 'react';

interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
  onPrivacy: () => void;
  onTryDemo?: () => void;
}

export function LandingPage({ onSignUp, onSignIn, onPrivacy }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > window.innerHeight - 100;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#eaff7b] selection:text-slate-900">

      {/* Scroll-aware Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-slate-900/95 backdrop-blur-md py-4 shadow-xl' : 'bg-transparent py-6'
        }`}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <button
            onClick={() => scrollToSection('hero')}
            className={`text-2xl font-serif font-bold transition-colors ${scrolled ? 'text-white' : 'text-slate-900'}`}
          >
            justin
          </button>

          <div className={`hidden md:flex items-center gap-8 text-sm font-medium transition-colors ${scrolled ? 'text-slate-300' : 'text-slate-700'}`}>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-[#eaff7b] transition-colors">How It Works</button>
            <button onClick={() => scrollToSection('features')} className="hover:text-[#eaff7b] transition-colors">Features</button>
            <button onClick={() => scrollToSection('use-cases')} className="hover:text-[#eaff7b] transition-colors">Use Cases</button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onSignIn}
              className={`text-sm font-bold hover:text-[#eaff7b] transition-colors hidden sm:block ${scrolled ? 'text-white' : 'text-slate-900'}`}
            >
              Log In
            </button>
            <button
              onClick={onSignUp}
              className="bg-[#eaff7b] text-slate-900 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#d4e86d] hover:scale-105 transition-all shadow-lg shadow-[#eaff7b]/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-b from-[#eaff7b] to-[#4bf2e6]">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse delay-700"></div>

        <div className="max-w-3xl w-full text-center space-y-12 relative z-10 animate-fade-in-up">
          <div className="space-y-6">
            <h1 className="text-[5rem] md:text-[7rem] font-serif font-bold text-slate-900 leading-none tracking-tight">
              justin
            </h1>

            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl font-zilla font-medium text-slate-800 leading-tight">
                Let's reinvent Cash with Tech.
              </h2>

              <p className="text-xl md:text-2xl text-slate-700 max-w-xl mx-auto leading-relaxed font-light">
                Fast. Easy. Anonymous. Trusted.<br />
                <span className="font-medium text-slate-900">It's simply paying and giving, the way it used to be.</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <button
              onClick={onSignUp}
              className="w-full sm:w-auto min-w-[200px] bg-slate-900 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-xl hover:bg-slate-800 hover:scale-105 transition-all active:scale-95"
            >
              Get Started
            </button>
            <button
              onClick={onSignIn}
              className="w-full sm:w-auto min-w-[200px] bg-white/40 backdrop-blur-md text-slate-900 font-bold text-lg px-8 py-4 rounded-2xl border border-white/50 hover:bg-white/60 hover:scale-105 transition-all active:scale-95"
            >
              I have a wallet
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <button onClick={() => scrollToSection('problem')} className="text-slate-600 hover:text-slate-900 transition-colors flex flex-col items-center gap-2">
            <span className="text-sm font-medium uppercase tracking-widest opacity-50">Scroll</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-24 px-6 bg-white relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                When connection fails, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">money shouldn't.</span>
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Crowded festivals. Underground subways. Remote hikes.
                Traditional payment apps freeze when the signal drops.
                <strong className="text-slate-900">Justin works anywhere your phone is.</strong>
              </p>

              <div className="flex items-center gap-8 pt-4">
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  <span className="text-sm font-bold line-through decoration-2 decoration-red-500">WiFi</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-bold line-through decoration-2 decoration-red-500">5G</span>
                </div>
                <div className="w-px h-16 bg-slate-100"></div>
                <div className="flex flex-col items-center gap-2 text-emerald-500">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold">Works</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[2.5rem] rotate-3 opacity-10"></div>
              <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 shadow-xl relative">
                <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <span className="text-sm font-medium text-slate-500">No Internet Connection</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                  </svg>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl">🍕</div>
                      <div>
                        <p className="font-bold text-slate-900">Pizza Split</p>
                        <p className="text-xs text-slate-500">Sent to Alex</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">-$15.00</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-emerald-800">Payment Successful</p>
                        <p className="text-xs text-emerald-600">Offline Voucher Generated</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-600">Three simple steps to financial freedom.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: 'Load',
                desc: 'Add funds to your secure wallet.',
                icon: (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                ),
                color: 'bg-blue-500'
              },
              {
                title: 'Send',
                desc: 'Scan QR to pay instantly, online or off.',
                icon: (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                ),
                color: 'bg-indigo-500'
              },
              {
                title: 'Sync',
                desc: 'Transactions settle when you reconnect.',
                icon: (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                color: 'bg-purple-500'
              }
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="absolute inset-0 bg-white rounded-3xl shadow-xl transform transition-transform group-hover:-translate-y-2"></div>
                <div className="relative p-8 text-center">
                  <div className={`w-20 h-20 mx-auto mb-6 ${step.color} rounded-2xl shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform`}>
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-slate-900">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold text-slate-900">Why Justin?</h2>
              <p className="text-lg text-slate-600">
                We stripped away the complexity of crypto and kept the benefits.
                No confusing addresses, no gas fees for you, no waiting.
              </p>

              <div className="space-y-6">
                {[
                  { title: 'Privacy First', desc: 'Your data stays on your device.' },
                  { title: 'Zero Fees', desc: 'Transfers between friends are always free.' },
                  { title: 'Open Source', desc: 'Auditable, transparent, and secure.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <p className="text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-6 rounded-3xl">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="font-bold text-slate-900 mb-2">Secure</h3>
                <p className="text-sm text-slate-500">Bank-grade encryption for every byte.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl mt-8">
                <div className="text-4xl mb-4">⚡️</div>
                <h3 className="font-bold text-slate-900 mb-2">Fast</h3>
                <p className="text-sm text-slate-500">Settles in seconds, not days.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="font-bold text-slate-900 mb-2">Global</h3>
                <p className="text-sm text-slate-500">Send across borders instantly.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl mt-8">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="font-bold text-slate-900 mb-2">Trusted</h3>
                <p className="text-sm text-slate-500">Built on Base & Ethereum.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#eaff7b] rounded-full blur-[100px] opacity-10"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-10"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-serif font-bold mb-8">Ready to reinvent cash?</h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Join thousands of users experiencing the future of payments.
            No bank account required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onSignUp}
              className="bg-[#eaff7b] text-slate-900 font-bold text-lg px-10 py-5 rounded-2xl hover:bg-[#d4e86d] hover:scale-105 transition-all shadow-xl shadow-[#eaff7b]/20"
            >
              Create Free Wallet
            </button>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Available on iOS, Android, and Web.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-950 text-slate-400 border-t border-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl font-serif font-bold text-white">justin</div>
          <div className="flex gap-8 text-sm">
            <button onClick={onPrivacy} className="hover:text-white transition-colors">Privacy Policy</button>
            <button className="hover:text-white transition-colors">Terms of Service</button>
            <button className="hover:text-white transition-colors">Support</button>
          </div>
          <div className="text-sm">
            © 2024 Justin App. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

