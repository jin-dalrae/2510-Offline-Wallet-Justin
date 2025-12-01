

interface PrivacyPolicyProps {
    onBack: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-6">
            <div className="max-w-2xl mx-auto animate-fade-in">
                <button
                    onClick={onBack}
                    className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </button>

                <h1 className="text-3xl font-serif font-bold mb-8">Privacy Policy & User Agreement</h1>

                <div className="prose prose-slate max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-bold font-zilla mb-3">1. Non-Custodial Service</h2>
                        <p className="text-slate-600 leading-relaxed">
                            "justin" is a non-custodial wallet application. This means:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                            <li>You have sole responsibility for your private keys and funds.</li>
                            <li>We do not store your private keys on our servers.</li>
                            <li>We cannot recover your funds if you lose your private key.</li>
                            <li>You are responsible for backing up your wallet credentials.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold font-zilla mb-3">2. Data Collection & Privacy</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We prioritize your anonymity and privacy:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                            <li><strong>Local Storage:</strong> Your wallet data, including encrypted keys and transaction history, is stored locally on your device using IndexedDB.</li>
                            <li><strong>Blockchain Data:</strong> Transactions are public on the Base Sepolia blockchain. This is inherent to how blockchains work.</li>
                            <li><strong>No Personal Info:</strong> We do not collect your name, email, or phone number. "Account Names" are stored locally on your device only.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold font-zilla mb-3">3. Offline Transactions</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Our offline transaction feature uses QR codes to transfer signed vouchers.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                            <li>Vouchers contain a temporary private key with the transaction amount.</li>
                            <li>These vouchers are valid for 7 days.</li>
                            <li>You are responsible for ensuring the physical security of your device when generating or scanning vouchers.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold font-zilla mb-3">4. Testnet Usage</h2>
                        <p className="text-slate-600 leading-relaxed">
                            This application currently operates on the <strong>Base Sepolia Testnet</strong>.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                            <li>Funds have NO real-world monetary value.</li>
                            <li>The software is provided "as is" for testing and demonstration purposes.</li>
                            <li>We are not liable for any loss of data or testnet funds.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold font-zilla mb-3">5. User Agreement</h2>
                        <p className="text-slate-600 leading-relaxed">
                            By using "justin", you agree to:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                            <li>Use the application lawfully and responsibly.</li>
                            <li>Not attempt to exploit vulnerabilities in the smart contracts or application logic.</li>
                            <li>Accept all risks associated with the use of blockchain technology and experimental software.</li>
                        </ul>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200 text-sm text-slate-500 text-center">
                    <p>Last Updated: December 2025</p>
                </div>
            </div>
        </div>
    );
}
