import { LegalDocument } from './LegalDocument';

const EFFECTIVE_DATE = 'May 14, 2026';

interface TermsProps {
    onBack: () => void;
    onOpenPrivacy: () => void;
}

export function Terms({ onBack, onOpenPrivacy }: TermsProps) {
    return (
        <LegalDocument
            title="Terms of Service"
            effectiveDate={EFFECTIVE_DATE}
            summary="Justin is a self-custody stablecoin wallet that signs payment vouchers offline and settles them on the Base network. These terms describe what we provide, what you're responsible for, and the risks you take by using the app."
            onBack={onBack}
            secondary={{ label: 'Read Privacy Policy →', onClick: onOpenPrivacy }}
            sections={[
                {
                    id: 'agreement',
                    heading: 'Your Agreement',
                    body: (
                        <>
                            <p>
                                These Terms of Service (the <strong>"Terms"</strong>) form a binding legal agreement between you and <strong>[Company Name]</strong> (<strong>"Company,"</strong> <strong>"we,"</strong> or <strong>"us"</strong>) governing your use of the Justin mobile application, smart contracts, and related software and services we make available (collectively, the <strong>"Service"</strong>). By creating a wallet, importing a wallet, or otherwise using the Service, you agree to be bound by these Terms and by our <a href="#" onClick={(e) => { e.preventDefault(); onOpenPrivacy(); }}>Privacy Policy</a>.
                            </p>
                            <p>
                                If you do not agree to these Terms, do not use the Service. We may update these Terms from time to time; if we make material changes, we will notify you in the app and, where required, ask you to re-accept. Your continued use of the Service after an update means you accept the revised Terms.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'eligibility',
                    heading: 'Eligibility',
                    body: (
                        <>
                            <p>To use the Service, you must:</p>
                            <ul>
                                <li>Be at least 18 years old, or the age of majority in your jurisdiction if higher;</li>
                                <li>Have full legal capacity to enter into these Terms on your own behalf or on behalf of an entity you represent;</li>
                                <li>Not be a resident of, or located in, any country, region, or territory subject to comprehensive sanctions administered by the U.S. Department of the Treasury's Office of Foreign Assets Control (<strong>"OFAC"</strong>), the European Union, the United Kingdom, or other applicable authorities (currently including, without limitation, Cuba, Iran, North Korea, Syria, the Crimea region of Ukraine, and the so-called Donetsk and Luhansk People's Republics);</li>
                                <li>Not appear on any list of prohibited or restricted parties maintained by OFAC, the U.S. Department of Commerce, the U.S. Department of State, the United Nations, or other applicable authorities;</li>
                                <li>Comply with all laws and regulations that apply to you, including tax, anti-money laundering, and counter-terrorism financing laws.</li>
                            </ul>
                            <p>
                                We may, at our discretion, restrict or terminate access to the Service for any user we determine, in good faith, to be ineligible.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'wallet',
                    heading: 'Self-Custody Wallet',
                    body: (
                        <>
                            <p>
                                Justin is a <strong>self-custody, non-custodial wallet</strong>. That means:
                            </p>
                            <ul>
                                <li>You — and only you — control the private keys associated with your wallet. We never see, store, transmit, or have access to your private keys, your recovery phrase, or your wallet password.</li>
                                <li>Your private key is encrypted with a password you choose and stored locally on your device using your operating system's secure storage (iOS Keychain or browser IndexedDB).</li>
                                <li><strong>If you lose your recovery phrase, password, or device, we cannot help you recover your funds.</strong> There is no "forgot password" recovery for self-custody wallets. Back up your recovery phrase and store it somewhere only you can access.</li>
                                <li>You are responsible for keeping your device, your password, and your recovery phrase secure, and for the security of any third-party software or hardware you use with the Service.</li>
                            </ul>
                            <p>
                                The Service is a software interface that helps you interact with public blockchains. We do not operate the blockchain itself, we do not control whether your transactions are confirmed, and we cannot reverse, cancel, or modify a transaction once it has been broadcast.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'offline-escrow',
                    heading: 'Offline Payments and the Escrow Contract',
                    body: (
                        <>
                            <p>
                                Justin's offline payment feature uses a publicly deployed smart contract, the <strong>"OfflineEscrow"</strong> contract, on the Base network.
                            </p>
                            <p><strong>How it works.</strong></p>
                            <ol>
                                <li>While online, you deposit a stablecoin balance into the OfflineEscrow contract using your wallet's <code>approve</code> and <code>deposit</code> functions. This balance is your "offline budget."</li>
                                <li>While offline, you sign a payment voucher using your wallet's private key. The voucher is an EIP-712 typed-data message specifying a recipient address, amount, token, nonce, and deadline. Signing the voucher does not transfer funds on its own — it is a commitment that the recipient can redeem against your offline budget.</li>
                                <li>When the recipient (or anyone acting for them) is next online, they submit the voucher to the contract. The contract verifies your signature, verifies that the nonce has not been used, and transfers the specified amount from your offline budget to the recipient.</li>
                                <li>You can withdraw any unspent offline budget back to your wallet at any time.</li>
                            </ol>
                            <p><strong>What this means for you.</strong></p>
                            <ul>
                                <li><strong>Once signed, a voucher is a commitment.</strong> Anyone in possession of the voucher can redeem it against your offline budget until either you withdraw the underlying balance or the voucher's deadline passes. You should treat a voucher like a check you have already mailed.</li>
                                <li><strong>The contract is immutable.</strong> The OfflineEscrow contract has no admin upgrade key, no pause function, and no ability for us or anyone else to move your funds. The only way funds leave the contract are through (a) your own <code>withdraw</code> call or (b) a valid claim of a voucher you signed.</li>
                                <li><strong>You are responsible for managing your offline budget.</strong> If you deposit funds into the contract and then lose access to your wallet, those funds remain locked in the contract.</li>
                                <li><strong>Voucher expiration.</strong> Vouchers expire 24 hours after they are signed by default. After expiration, they cannot be claimed.</li>
                            </ul>
                        </>
                    ),
                },
                {
                    id: 'third-parties',
                    heading: 'Third-Party Services',
                    body: (
                        <>
                            <p>
                                The Service relies on third-party infrastructure to function. We do not own or control these third parties, and your use of them is governed by their own terms and privacy policies. By using the Service, you also agree to comply with their terms where they apply to you:
                            </p>
                            <ul>
                                <li><strong>Base network</strong>, an Ethereum Layer 2 rollup operated by Coinbase Technologies, Inc. and Optimism, on which the OfflineEscrow contract is deployed and on which your transactions settle.</li>
                                <li><strong>Coinbase Developer Platform (CDP)</strong>, including the CDP RPC and CDP Faucet, used for blockchain access and testnet funding.</li>
                                <li><strong>Coinbase Onramp</strong> (Coinbase Pay), used optionally to buy USDC with fiat. Coinbase performs its own identity verification (KYC) and compliance checks; we do not.</li>
                                <li><strong>Google Firebase</strong>, used optionally for cloud sync of transaction metadata across your devices and for anonymous and Google sign-in.</li>
                                <li><strong>Apple Inc.</strong>, the operator of the App Store and iOS platform.</li>
                                <li><strong>Public RPC providers</strong>, used as a fallback to read blockchain state.</li>
                            </ul>
                            <p>
                                We do not endorse, and are not responsible for, any third-party service, smart contract, dApp, or token that you choose to interact with using the Service.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'fees',
                    heading: 'Fees, Network Costs, and Taxes',
                    body: (
                        <>
                            <p>
                                Using the Service may incur costs that are not paid to us:
                            </p>
                            <ul>
                                <li><strong>Network fees (gas)</strong> are paid to the Base network for every on-chain action, including depositing into the escrow, withdrawing, and claiming a voucher. Network fees fluctuate; we do not set them and we do not receive them.</li>
                                <li><strong>Third-party fees</strong> may be charged by Coinbase Onramp, card networks, exchanges, or other providers when you buy, sell, or move funds. We do not control or receive these fees.</li>
                            </ul>
                            <p>
                                We do not currently charge our own fee for using the Service. If that changes, we will give you notice in advance.
                            </p>
                            <p>
                                You are solely responsible for any taxes that apply to your transactions, including capital gains, income, sales, value-added, and other taxes. The Service does not provide tax advice and we do not file taxes on your behalf.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'acceptable-use',
                    heading: 'Acceptable Use',
                    body: (
                        <>
                            <p>When you use the Service, you agree that you will not:</p>
                            <ul>
                                <li>Use the Service for any unlawful purpose, including money laundering, terrorist financing, tax evasion, fraud, or sanctions evasion;</li>
                                <li>Send funds to, or receive funds from, any person or entity sanctioned under applicable law;</li>
                                <li>Use the Service to engage in market manipulation, wash trading, or other deceptive practices;</li>
                                <li>Attempt to reverse engineer, decompile, exploit, or otherwise compromise the security of the Service or the OfflineEscrow contract;</li>
                                <li>Use the Service to transmit malware, phishing payloads, or any code designed to harm other users;</li>
                                <li>Impersonate another person, misrepresent your identity, or create vouchers you know to be invalid;</li>
                                <li>Use the Service in a manner that imposes unreasonable load on third-party providers, including denial-of-service attacks against RPC endpoints or the CDP infrastructure;</li>
                                <li>Use the Service if you are prohibited from doing so under "Eligibility" above.</li>
                            </ul>
                            <p>
                                We may suspend or terminate your access to the Service if we reasonably believe you have violated these rules.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'risks',
                    heading: 'Risks You Accept',
                    body: (
                        <>
                            <p>
                                You acknowledge and accept that using the Service carries substantial risks, including but not limited to:
                            </p>
                            <ul>
                                <li><strong>Loss of keys.</strong> If you lose your recovery phrase or password, your funds are unrecoverable. We cannot help you.</li>
                                <li><strong>Smart contract risk.</strong> The OfflineEscrow contract has been written carefully and tested, but no software is bug-free. A bug, exploit, or unexpected interaction could result in partial or total loss of funds locked in the contract. The contract is open source; you are encouraged to review it.</li>
                                <li><strong>Network risk.</strong> The Base network may experience downtime, congestion, reorganizations, or other failures outside our control. Your transactions may be delayed, dropped, or replayed.</li>
                                <li><strong>Stablecoin risk.</strong> USDC, EURC, and cbBTC are issued by third parties. If those issuers fail, are sanctioned, or de-peg from their reference assets, your holdings may lose value.</li>
                                <li><strong>Regulatory risk.</strong> Laws governing stablecoins, self-custody wallets, and blockchain payments are evolving and vary by jurisdiction. Changes in law may affect your ability to use the Service or your funds.</li>
                                <li><strong>Counterparty risk.</strong> When you receive a voucher, you trust that the sender's offline budget will be funded when you claim it. Claiming earlier reduces this risk. You can pre-check claimability using the contract's <code>quoteClaim</code> view function.</li>
                                <li><strong>Device risk.</strong> If your device is lost, stolen, or compromised, anyone with your wallet password can spend your funds. Use a strong password and the device's biometric lock.</li>
                                <li><strong>Public transactions.</strong> All on-chain activity, including escrow deposits, withdrawals, and claims, is permanently public on the Base blockchain.</li>
                            </ul>
                            <p>
                                <strong>You bear all of these risks.</strong> Do not deposit funds you cannot afford to lose.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'no-fiduciary',
                    heading: 'No Fiduciary or Advisory Relationship',
                    body: (
                        <>
                            <p>
                                We provide software. We are not a bank, a broker, a money transmitter, an investment adviser, or a fiduciary. We do not offer investment, legal, tax, or accounting advice. Nothing in the Service is a recommendation to buy, sell, hold, or transfer any asset. You should consult your own professionals before making financial decisions.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'disclaimers',
                    heading: 'Disclaimers',
                    body: (
                        <>
                            <p>
                                THE SERVICE IS PROVIDED <strong>"AS IS"</strong> AND <strong>"AS AVAILABLE"</strong>, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF DEALING OR USAGE OF TRADE.
                            </p>
                            <p>
                                WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS, OR THAT ANY DEFECTS WILL BE CORRECTED. NO ADVICE OR INFORMATION OBTAINED FROM US CREATES ANY WARRANTY NOT EXPRESSLY STATED IN THESE TERMS.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'liability',
                    heading: 'Limitation of Liability',
                    body: (
                        <>
                            <p>
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER WE NOR OUR AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES, OR AGENTS WILL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO YOUR USE OF, OR INABILITY TO USE, THE SERVICE.
                            </p>
                            <p>
                                IN NO EVENT WILL OUR AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US, IF ANY, IN THE TWELVE MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY, OR (B) ONE HUNDRED U.S. DOLLARS (US$100).
                            </p>
                            <p>
                                Some jurisdictions do not allow the exclusion or limitation of certain damages. In those jurisdictions, the above limitations apply only to the maximum extent permitted by law.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'indemnification',
                    heading: 'Indemnification',
                    body: (
                        <>
                            <p>
                                You agree to defend, indemnify, and hold harmless us, our affiliates, and our respective officers, directors, employees, and agents from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or relating to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any applicable law or third-party right; (d) any transaction you initiate, send, receive, or claim using the Service; or (e) any voucher you sign or accept.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'ip',
                    heading: 'Intellectual Property',
                    body: (
                        <>
                            <p>
                                We retain all right, title, and interest in and to the Service, including its software, design, trademarks, and branding, except for portions explicitly licensed under open-source licenses. We grant you a limited, personal, non-exclusive, non-transferable, revocable license to use the Service for its intended purpose, subject to these Terms.
                            </p>
                            <p>
                                You retain ownership of any content you create using the Service. By submitting feedback or suggestions, you grant us a perpetual, irrevocable, royalty-free license to use them without restriction.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'termination',
                    heading: 'Suspension and Termination',
                    body: (
                        <>
                            <p>
                                You may stop using the Service at any time by removing the app and, if you wish, calling <code>withdraw</code> on the OfflineEscrow contract to recover any locked balance.
                            </p>
                            <p>
                                We may suspend or terminate your access to the Service, with or without notice, if we reasonably believe you have violated these Terms, if required by law, or if continued provision of the Service to you would expose us to legal or operational risk. Termination does not affect rights or obligations that, by their nature, are intended to survive — including disclaimers, limitations of liability, indemnification, and dispute resolution.
                            </p>
                            <p>
                                Because the OfflineEscrow contract is autonomous and immutable, your ability to withdraw funds from the contract is not affected by termination of your account with us.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'governing-law',
                    heading: 'Governing Law and Dispute Resolution',
                    body: (
                        <>
                            <p>
                                These Terms are governed by the laws of the State of California, without regard to its conflict-of-laws principles, and the federal laws of the United States. The United Nations Convention on Contracts for the International Sale of Goods does not apply.
                            </p>
                            <p>
                                <strong>Mandatory Arbitration.</strong> You and we agree that any dispute, claim, or controversy arising out of or relating to these Terms or the Service will be resolved by binding individual arbitration administered by JAMS under its applicable rules, rather than in court, except that (i) you or we may bring an individual claim in small-claims court, and (ii) you or we may seek injunctive relief in court for misuse of intellectual property. The arbitration will be held in San Francisco, California, or another location agreed by the parties.
                            </p>
                            <p>
                                <strong>Class Action Waiver.</strong> You and we agree that each party may bring claims against the other only on an individual basis and not as a plaintiff or class member in any purported class or representative action. The arbitrator may not consolidate more than one person's claims and may not preside over any form of class proceeding.
                            </p>
                            <p>
                                <strong>30-day right to opt out.</strong> If you do not want to be bound by the arbitration agreement and class-action waiver above, send written notice to <a href="mailto:legal@justin.example">legal@justin.example</a> within thirty (30) days of first accepting these Terms, stating your name, the email associated with your account if any, and that you opt out of the arbitration provision. Opting out will not affect the rest of these Terms.
                            </p>
                        </>
                    ),
                },
                {
                    id: 'misc',
                    heading: 'Miscellaneous',
                    body: (
                        <>
                            <p>
                                These Terms, together with our <a href="#" onClick={(e) => { e.preventDefault(); onOpenPrivacy(); }}>Privacy Policy</a>, are the entire agreement between you and us regarding the Service and supersede any prior agreements on the same subject. If any provision is held unenforceable, the remaining provisions will continue in effect. Our failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition, or sale of assets.
                            </p>
                            <p>
                                <strong>Apple-specific terms.</strong> If you obtained the Service through the Apple App Store: (i) these Terms are between you and us, not Apple, and Apple is not responsible for the Service; (ii) Apple is a third-party beneficiary of these Terms and may enforce them against you; (iii) you must comply with the Apple Media Services Terms and Conditions; (iv) in the event of a conflict between these Terms and Apple's rules, Apple's rules will control with respect to your use of the iOS version of the Service.
                            </p>
                            <p>
                                <strong>Contact.</strong> Questions about these Terms? Email <a href="mailto:legal@justin.example">legal@justin.example</a>.
                            </p>
                        </>
                    ),
                },
            ]}
        />
    );
}
