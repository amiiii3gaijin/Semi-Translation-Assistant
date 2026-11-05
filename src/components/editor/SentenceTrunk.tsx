import { Info } from 'lucide-react';
import { Token } from '../../types';
import { extractTrunk } from '../../utils/trunkExtractor';

export function SentenceTrunk({ tokens }: { tokens: Token[] }) {
  const trunkTokens = extractTrunk(tokens);
  return <section className="trunk-panel" aria-label="结构主干">
    <h2 className="trunk-title"><Info className="ui-icon" aria-hidden="true" />结构主干 · 词性提示</h2>
    {trunkTokens.length
      ? <div className="trunk-terms">{trunkTokens.map(token =>
          <span key={token.id} title={`词性：${token.pos}`}
            className={`trunk-term ${token.pos === 'v' ? 'trunk-term--verb' : token.pos === 'n' || token.pos === 'r' ? 'trunk-term--noun' : ''}`}>
            {token.text}
          </span>)}</div>
      : <p className="ui-caption">当前句子暂无可显示的词性提示。</p>}
  </section>;
}

