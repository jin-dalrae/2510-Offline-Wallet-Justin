import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

interface LegalDocumentProps {
    title: string;
    effectiveDate: string;
    /** A short subtitle shown under the title. */
    summary?: string;
    /** Section blocks, in order. The id is used for the table of contents. */
    sections: ReadonlyArray<{ id: string; heading: string; body: ReactNode }>;
    onBack: () => void;
    /** Optional secondary nav (e.g. link to the *other* legal doc). */
    secondary?: { label: string; onClick: () => void };
}

/**
 * Shared chrome for long-form legal documents (Terms, Privacy, etc.).
 * Provides a sticky back bar, a table of contents that scroll-spies the
 * current section, and consistent typography.
 */
export function LegalDocument({
    title,
    effectiveDate,
    summary,
    sections,
    onBack,
    secondary,
}: LegalDocumentProps) {
    const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]?.target.id) setActiveId(visible[0].target.id);
            },
            { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
        );

        for (const ref of Object.values(sectionRefs.current)) {
            if (ref) observer.observe(ref);
        }
        return () => observer.disconnect();
    }, [sections]);

    const tocItems = useMemo(
        () => sections.map((s) => ({ id: s.id, heading: s.heading })),
        [sections]
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Sticky back bar */}
            <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                    {secondary && (
                        <button
                            onClick={secondary.onClick}
                            className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
                        >
                            {secondary.label}
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-10">
                {/* Table of contents */}
                <aside className="hidden lg:block">
                    <div className="sticky top-24">
                        <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">Contents</p>
                        <nav className="space-y-1">
                            {tocItems.map(({ id, heading }) => (
                                <a
                                    key={id}
                                    href={`#${id}`}
                                    className={`block py-1.5 text-sm border-l-2 pl-3 transition-colors ${
                                        activeId === id
                                            ? 'border-slate-900 text-slate-900 font-semibold'
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {heading}
                                </a>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Body */}
                <main className="min-w-0">
                    <header className="mb-10 pb-8 border-b border-slate-200">
                        <h1 className="text-4xl font-serif font-bold mb-3">{title}</h1>
                        {summary && <p className="text-lg text-slate-600 leading-relaxed">{summary}</p>}
                        <p className="text-sm text-slate-500 mt-4">Effective {effectiveDate}</p>
                    </header>

                    <div className="space-y-12">
                        {sections.map((section, idx) => (
                            <section
                                key={section.id}
                                id={section.id}
                                ref={(el) => {
                                    sectionRefs.current[section.id] = el;
                                }}
                                className="scroll-mt-24"
                            >
                                <h2 className="text-2xl font-serif font-bold mb-4 flex items-baseline gap-3">
                                    <span className="text-slate-300 text-base font-mono">
                                        {String(idx + 1).padStart(2, '0')}
                                    </span>
                                    {section.heading}
                                </h2>
                                <div className="text-slate-700 leading-relaxed space-y-4 [&_strong]:text-slate-900 [&_a]:underline [&_a]:underline-offset-4 [&_a]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2">
                                    {section.body}
                                </div>
                            </section>
                        ))}
                    </div>

                    <footer className="mt-16 pt-8 border-t border-slate-200 text-sm text-slate-500">
                        <p>If you have questions about this document, contact <a href="mailto:legal@justin.example">legal@justin.example</a>.</p>
                        <p className="mt-2">Effective {effectiveDate}.</p>
                    </footer>
                </main>
            </div>
        </div>
    );
}
