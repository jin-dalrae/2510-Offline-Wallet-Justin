import { useState } from 'react';

interface LoadMoneyProps {
    onClose: () => void;
}

export function LoadMoney({ onClose }: LoadMoneyProps) {
    const [currency, setCurrency] = useState<'USDC' | 'EURC' | 'cbBTC'>('USDC');

    const getBankDetails = () => {
        switch (currency) {
            case 'USDC':
                return {
                    bankName: 'Silvergate Bank',
                    accountName: 'Circle Internet Financial',
                    accountNumber: '8392019283',
                    routingNumber: '021000021',
                    reference: 'USDC-DEPOSIT-USER-123',
                    notes: 'Wire transfers only. Funds will settle as USDC.',
                };
            case 'EURC':
                return {
                    bankName: 'Revolut Bank UAB',
                    accountName: 'Circle Euro Operations',
                    accountNumber: 'LT92 3092 1029 3829 1029',
                    routingNumber: 'BIC: RVLTLT22',
                    reference: 'EURC-DEPOSIT-USER-123',
                    notes: 'SEPA Immediate transfers supported.',
                };
            case 'cbBTC':
                return {
                    bankName: 'Coinbase Custody',
                    accountName: 'Coinbase BTC Deposits',
                    accountNumber: 'BTC-9283-1029',
                    routingNumber: 'N/A',
                    reference: 'BTC-DEPOSIT-USER-123',
                    notes: 'Deposit Bitcoin requires 6 confirmations.',
                };
            default:
                return null;
        }
    };

    const details = getBankDetails();

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast logic would be handled by parent or local toast if we import it
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans text-slate-900">
            {/* Transparent backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

            <div className="relative bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-md space-y-6 animate-slide-up border border-slate-100">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-serif font-bold">Load Money</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Currency Selector */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 ml-1">Select Currency</label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                        {(['USDC', 'EURC', 'cbBTC'] as const).map((curr) => (
                            <button
                                key={curr}
                                onClick={() => setCurrency(curr)}
                                className={`py-2 rounded-lg font-bold text-sm transition-all ${currency === curr
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {curr}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bank Details */}
                {details && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
                        <div className="text-center mb-2">
                            <p className="text-sm text-slate-500 mb-1">Deposit to</p>
                            <h4 className="font-bold text-lg text-slate-900">{details.bankName}</h4>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Account Name</span>
                                <span className="text-sm font-medium text-right text-slate-700">{details.accountName}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Account Number</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono font-bold text-slate-900">{details.accountNumber}</span>
                                    <button onClick={() => handleCopy(details.accountNumber)} className="text-blue-600 hover:text-blue-700">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">{currency === 'EURC' ? 'BIC / SWIFT' : 'Routing Number'}</span>
                                <span className="text-sm font-mono font-bold text-slate-900">{details.routingNumber}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-slate-500">Reference / Memo</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono font-bold text-slate-900 bg-yellow-50 px-2 py-1 rounded">{details.reference}</span>
                                    <button onClick={() => handleCopy(details.reference)} className="text-blue-600 hover:text-blue-700">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg text-center">
                                {details.notes}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
