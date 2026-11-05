import { Token } from '../types';

export function extractTrunk(tokens: Token[]): Token[] {
    // 提取名词性、动词性、代词等核心主干结构标记
    const trunkTags = ['n', 'v', 'a', 'r'];
    
    return tokens.filter(t => 
        !t.isPunctuation && 
        !t.isCitation &&
        typeof t.pos === 'string' && trunkTags.includes(t.pos)
    );
}
