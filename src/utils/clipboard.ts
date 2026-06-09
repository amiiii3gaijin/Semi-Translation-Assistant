export const copyToClipboard = async (text: string): Promise<boolean> => {
    // 1. Try modern async API
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn("Async clipboard write failed, trying fallback...", err);
            // Fallthrough to fallback
        }
    }

    // 2. Fallback to execCommand
    return new Promise((resolve) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            
            // Avoid scrolling to bottom
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            textArea.style.opacity = "0"; // Invisible
            textArea.style.pointerEvents = "none";
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            resolve(successful);
        } catch (err) {
            console.error("Fallback copy failed", err);
            resolve(false);
        }
    });
};
