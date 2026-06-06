import { Token } from '../../types';
import { extractTrunk } from '../../utils/trunkExtractor';
import { motion } from 'motion/react';

interface SentenceTrunkProps {
    tokens: Token[];
}

export function SentenceTrunk({ tokens }: SentenceTrunkProps) {
    const trunkTokens = extractTrunk(tokens);
    
    if (trunkTokens.length === 0) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-5 glass-panel rounded-[24px] w-full max-w-lg mx-auto text-left shadow-sm border border-white/60"
        >
            <div className="font-semibold text-gray-500 mb-3 flex items-center gap-2 text-xs uppercase tracking-widest">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 text-blue-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
               自动句法主干 (Sentence Trunk)
            </div>
            <div className="flex flex-wrap gap-2 break-words leading-relaxed">
                {trunkTokens.map((t, idx) => (
                    <span 
                        key={t.id + '_' + idx} 
                        title={`词性: ${t.pos}`}
                        className={`px-3 py-1 rounded-full text-sm font-semibold tracking-wide shadow-sm border ${
                            t.pos?.startsWith('v') ? 'bg-orange-100/90 text-orange-800 border-orange-200' : 
                            (t.pos?.startsWith('n') || t.pos?.startsWith('r')) ? 'bg-blue-100/90 text-blue-800 border-blue-200' : 
                            'bg-white text-gray-700 border-gray-200'
                        }`}
                    >
                        {t.text}
                    </span>
                ))}
            </div>
        </motion.div>
    );
}
