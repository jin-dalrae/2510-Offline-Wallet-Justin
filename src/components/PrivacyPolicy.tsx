import { LegalDocument } from './LegalDocument';

const EFFECTIVE_DATE = 'May 14, 2026';

interface PrivacyPolicyProps {
    onBack: () => void;
    onOpenTerms: () => void;
}

export function PrivacyPolicy({ onBack, onOpenTerms }: PrivacyPolicyProps) {
    return (
        <LegalDocument
            title="Privacy Policy"
            effectiveDate={EFFECTIVE_DATE}
            summary="Justin is a self-custody wallet. We collect as little personal information as we can while still making the app work. This policy explains what we do collect, what we don't, and what's inherently public because of how blockchains work."
            onBack={onBack}
            secondary={{ label: 'Read Terms of Service →', onClick: onOpenTerms }}
            sections={[
                {
                    id: 'who-we-are',
                    heading: 'Who We Are',
                    body: (
                        <>
                            <p>
                                This Privacy Policy describes how <strong>[Company Name]</strong> (<strong>"Company,"</strong> <strong>"we,"</strong> or <strong>"us"</strong>) handles information in connection with your use of the Justin mobile application and related services (the <strong>"Service"</strong>). It applies whether you reach the Service through iOS, a web browser, or any other surface.
                            </p>
                            <p>
                                Justin is a self-custody stablecoin wallet. We do not hold or have access to your private keys. That fact shapes most of this policy.
                            </p>
                            <p>
                                If you have questions, contact us at <a href="mailto:privacy@justin.example">privacy@justin.example</a>.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'what-we-do-not-collect',
                    heading: 'What We Do Not Collect',
                    body: (
                        <>
                            <p>
                                Because Justin is a self-custody wallet, we never see and never collect:
                            </p>
                            <ul>
                                <li>Your wallet's private key.</li>
                                <li>Your recovery phrase.</li>
                                <li>Your wallet password.</li>
                                <li>Decrypted contents of your offline vouchers or transactions.</li>
                            </ul>
                            <p>
                                These remain on your device, encrypted at rest using a password you choose. Even if our servers were fully compromised, your keys could not be recovered from anything we hold.
                            </p>
                            <p>
                                We also do not collect government-issued ID, Social Security numbers, biometric data, or other identity documents. If you use Coinbase Onramp to buy stablecoins with fiat from within the Service, Coinbase performs identity verification on its own platform under its own privacy policy; we do not receive or store the information you provide to Coinbase for that purpose.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'what-we-collect',
                    heading: 'What We Do Collect',
                    body: (
                        <>
                            <p>The information we collect falls into a few clear categories.</p>

                            <p><strong>Information stored on your device only.</strong> Most data lives in your device's local storage (IndexedDB on the web, the iOS Keychain and the app sandbox on iOS) and is never transmitted to us:</p>
                            <ul>
                                <li>Your encrypted private key.</li>
                                <li>A device identifier (a random UUID generated at first launch).</li>
                                <li>Your offline transaction ledger (pending sends, received vouchers, settled transactions).</li>
                                <li>Your account name and optional profile picture.</li>
                                <li>Wallet session state (whether the wallet is currently unlocked in this tab/session).</li>
                            </ul>

                            <p><strong>Information you choose to sync to the cloud (optional).</strong> If you create an account with a username and password, or sign in with Google, we store the following in Google Firebase on your behalf so you can sync across devices:</p>
                            <ul>
                                <li>Your username, account name, and (for Google sign-in) the email address and display name provided by Google.</li>
                                <li>Your wallet's public address.</li>
                                <li>Your encrypted private key (still encrypted with your password — we cannot decrypt it).</li>
                                <li>Metadata for transactions you choose to record in the cloud, including sender address, receiver address, amount, token, status, and timestamps. This data is associated with the Firebase user ID issued to you when you sign in.</li>
                                <li>Audit-log entries when administrative actions are performed (only relevant to project administrators).</li>
                            </ul>
                            <p>If you do not sign in with a username or with Google, none of this cloud data is created.</p>

                            <p><strong>Information that is inherently public on the blockchain.</strong> Every interaction with the Base network is publicly visible and permanent:</p>
                            <ul>
                                <li>Your wallet address and the addresses you transact with.</li>
                                <li>Amounts, token types, timestamps, and block numbers of every on-chain transaction.</li>
                                <li>Deposits to and withdrawals from the OfflineEscrow contract, and claims made against it.</li>
                            </ul>
                            <p>
                                We do not "publish" this — it is public the moment a transaction is broadcast, regardless of how you broadcast it. Anyone in the world can read it from the chain.
                            </p>

                            <p><strong>Standard technical data.</strong> Like virtually every mobile app, the Service may collect, or have collected on its behalf by Apple and our infrastructure providers, basic technical signals such as:</p>
                            <ul>
                                <li>App version, OS version, device model.</li>
                                <li>Approximate region inferred from IP address.</li>
                                <li>Crash reports and basic error logs, when you opt in.</li>
                            </ul>
                            <p>We do not currently operate analytics SDKs that track individual user behavior across screens.</p>
                        </>
                    ),
                },
                {
                    id: 'how-we-use',
                    heading: 'How We Use Information',
                    body: (
                        <>
                            <p>We use the limited information we collect to:</p>
                            <ul>
                                <li>Operate, maintain, and improve the Service.</li>
                                <li>Sync your wallet metadata across your devices, if you opted into cloud sync.</li>
                                <li>Diagnose problems, investigate bugs, and prevent abuse.</li>
                                <li>Comply with legal obligations, lawful requests from authorities, and our own policies on acceptable use.</li>
                                <li>Communicate with you about the Service when necessary (for example, to notify you of a security incident).</li>
                            </ul>
                            <p>
                                We do not sell your personal information. We do not use it to build advertising profiles. We do not use it to train machine-learning models on you.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'sharing',
                    heading: 'Who We Share With',
                    body: (
                        <>
                            <p>
                                We share information only with the third-party service providers that make the Service possible, and only the minimum necessary for them to do their job. We do not share your information with advertisers, data brokers, or other unrelated parties.
                            </p>
                            <p><strong>Service providers we currently rely on:</strong></p>
                            <ul>
                                <li><strong>Google Firebase</strong> (Google LLC) — anonymous and Google authentication, Firestore database for optional cloud sync. Governed by Google's privacy policy.</li>
                                <li><strong>Coinbase Developer Platform</strong> (Coinbase Technologies, Inc.) — RPC access to the Base network. Every time the app reads or writes to the blockchain, the request goes through CDP's nodes, which see the request and the wallet address it's about. Governed by Coinbase's privacy policy.</li>
                                <li><strong>Coinbase Onramp / Coinbase Pay</strong> (Coinbase Inc.) — fiat-to-stablecoin onramp. If you choose to buy stablecoins with a card or bank account, you transact directly with Coinbase, which performs its own KYC. We do not see what you submit to Coinbase.</li>
                                <li><strong>Apple, Inc.</strong> — distribution via the App Store, push notification infrastructure (if used), and crash reporting.</li>
                                <li><strong>Base / Optimism Foundation</strong> — operators of the public Base network. Whenever you submit a transaction, the network sees the transaction.</li>
                            </ul>
                            <p>
                                We may share information when legally required, such as in response to a valid subpoena or court order, or when we have a good-faith belief that doing so is necessary to protect against harm. We will, where lawful, attempt to notify you before complying with such a request.
                            </p>
                            <p>
                                In the event we are acquired by or merged with another entity, your information may transfer to the successor entity, subject to a privacy notice consistent with this policy.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'cookies',
                    heading: 'Cookies, Local Storage, and Device Identifiers',
                    body: (
                        <>
                            <p>
                                The Service stores data on your device using browser- and OS-native mechanisms, primarily IndexedDB (for the encrypted wallet, voucher history, and offline budget cache) and <code>localStorage</code> (for small flags like the active wallet ID and budget snapshot). On iOS, the app sandbox holds the equivalent data using the operating system's secure storage facilities.
                            </p>
                            <p>
                                We use a random UUID as a device identifier so we can distinguish offline transactions made on different devices that share the same wallet. This identifier is generated and stored on your device only.
                            </p>
                            <p>
                                The Service does not currently set advertising or tracking cookies.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'security',
                    heading: 'Security',
                    body: (
                        <>
                            <p>
                                We take reasonable measures to protect the information we do hold, including:
                            </p>
                            <ul>
                                <li>Encrypting your private key on your device with your chosen password before it is ever written to disk.</li>
                                <li>Restricting cloud database access through ownership-based security rules (your data is keyed to your authenticated user ID).</li>
                                <li>Transmitting data over TLS in transit.</li>
                            </ul>
                            <p>
                                No system is perfectly secure. You bear the most important security responsibility: your password, your recovery phrase, and the device the wallet lives on. If those are compromised, the cryptographic protections we put in place will not save you. We recommend a strong password, the device's biometric or passcode lock, and storing your recovery phrase offline.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'retention',
                    heading: 'Data Retention',
                    body: (
                        <>
                            <p>
                                We retain the limited cloud data we hold for as long as your account exists. You can request deletion at any time (see "Your Rights" below). Note that:
                            </p>
                            <ul>
                                <li>On-chain data is permanent and cannot be deleted by anyone, including us. Once a transaction has been confirmed on Base, it is recorded forever in the public blockchain.</li>
                                <li>Your locally stored wallet data is deleted when you uninstall the app or use the in-app reset functionality.</li>
                                <li>We may retain a limited subset of data after account deletion if required by law, for fraud prevention, or to enforce our Terms.</li>
                            </ul>
                        </>
                    ),
                },
                {
                    id: 'rights',
                    heading: 'Your Rights',
                    body: (
                        <>
                            <p>
                                Depending on where you live, you may have specific rights with respect to your personal information. We honor the following globally, to the extent reasonably practical given the architecture of a self-custody wallet:
                            </p>
                            <ul>
                                <li><strong>Access.</strong> You can request a copy of the cloud information we hold associated with your account.</li>
                                <li><strong>Correction.</strong> You can update your account name, username, or profile picture at any time in the app.</li>
                                <li><strong>Deletion.</strong> You can request deletion of your cloud account and the cloud-side metadata we hold. We cannot, however, delete on-chain transactions or data already shared with third parties.</li>
                                <li><strong>Portability.</strong> Because the wallet itself lives on your device under your control, your private key and transaction history are already portable — they belong to you.</li>
                                <li><strong>Objection / restriction.</strong> You can stop using the optional cloud sync at any time; doing so prevents further metadata collection.</li>
                            </ul>
                            <p>
                                To exercise these rights, email <a href="mailto:privacy@justin.example">privacy@justin.example</a> from the email associated with your account. We will verify your identity in a way that does not require us to collect more information than necessary.
                            </p>
                            <p>
                                <strong>EU/UK residents</strong> may also have the right to lodge a complaint with their local data protection authority. <strong>California residents</strong> have specific rights under the CCPA/CPRA, including the right to know, the right to delete, the right to correct, and the right to opt out of "sales" or "sharing" of personal information; we do not sell or share personal information for cross-context behavioral advertising and have nothing to opt you out of, but we will respond to verifiable requests in accordance with applicable law.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'children',
                    heading: "Children's Privacy",
                    body: (
                        <>
                            <p>
                                The Service is not directed to, and we do not knowingly collect personal information from, children under the age of 13 (or the equivalent minimum age under applicable law). If you believe a child has provided us with information, please contact us and we will delete it. To use the Service, you must be at least 18 years old or the age of majority in your jurisdiction, as set out in the Terms of Service.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'international',
                    heading: 'International Users and Data Transfers',
                    body: (
                        <>
                            <p>
                                The Service is provided from the United States. If you use the Service from outside the United States, your information may be transferred to, stored in, and processed in countries other than your own — including the United States — where data protection laws may be different. We rely on appropriate safeguards, including standard contractual clauses where relevant, when transferring personal information internationally.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'do-not-track',
                    heading: 'Do Not Track',
                    body: (
                        <>
                            <p>
                                Some browsers offer a "Do Not Track" (<strong>"DNT"</strong>) signal. The Service does not currently perform cross-site or cross-app tracking, so DNT signals do not change our behavior. If that changes, we will update this policy.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'changes',
                    heading: 'Changes to This Policy',
                    body: (
                        <>
                            <p>
                                We may update this Privacy Policy from time to time. If we make material changes, we will provide notice in the app and, where required, ask for your renewed consent. The "Effective" date at the top of this page reflects when the current version took effect. Older versions are available on request.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'contact',
                    heading: 'How to Reach Us',
                    body: (
                        <>
                            <p>
                                Privacy questions, rights requests, or other concerns: <a href="mailto:privacy@justin.example">privacy@justin.example</a>.
                            </p>
                            <p>
                                For general questions about the Service, including the Terms of Service, contact <a href="mailto:legal@justin.example">legal@justin.example</a>.
                            </p>
                        </>
                    ),
                },
            ]}
        />
    );
}
