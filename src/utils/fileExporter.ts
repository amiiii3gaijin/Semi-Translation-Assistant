import { DocumentState } from '../types';

export function exportToJSON(documentState: DocumentState) {
  const jsonText = JSON.stringify(documentState, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Half_Translation_Backup_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToTXT(documentState: DocumentState) {
  const text = translationText(documentState);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Half_Translation_Export_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function translationText(documentState: DocumentState): string {
  return documentState.sentences.map(s => s.translatedText)
    .filter(text => text.trim().length > 0).join('\n');
}
