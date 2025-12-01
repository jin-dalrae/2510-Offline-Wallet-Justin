import { useState } from 'react';

interface ShowMnemonicProps {
    mnemonic: string;
    onClose: () => void;
}

export function ShowMnemonic({ mnemonic, onClose }: ShowMnemonicProps) {
    const [confirmed, setConfirmed] = useState(false);

    const words = mnemonic.split(' ');

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card max-w-md w-full space-y-4 animate-slide-up">
                <div>
                    <h3 className="text-xl font-bold text-amber-400">⚠️ Backup Your Recovery Phrase</h3>
                    <p className="text-gray-400 text-sm mt-2">
                        Write down these 12 words in order and store them safely. You'll need them to recover your wallet.
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {words.map((word, index) => (
                        <div
                            key={index}
                            className="glass p-3 rounded-lg text-center"
                        >
                            <span className="text-xs text-gray-500">{index + 1}</span>
                            <p className="font-semibold">{word}</p>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-2">
                    <p className="text-red-400 font-semibold text-sm">
                        🔐 Never share your recovery phrase
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Write it down on paper</li>
                        <li>• Store it in a safe place</li>
                        <li>• Never take a screenshot</li>
                        <li>• Never share it with anyone</li>
                    </ul>
                </div>

                <div className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        id="confirmed"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="mt-1"
                    />
                    <label htmlFor="confirmed" className="text-sm text-gray-300">
                        I have written down my recovery phrase and stored it safely
                    </label>
                </div>

                <button
                    onClick={onClose}
                    disabled={!confirmed}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
