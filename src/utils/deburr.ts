/**
 * The text without accents, with the same length (each character is converted on its own), so a
 * position found in it is the position in the original: "Café" -> "Cafe".
 */
export function deburr(text: string): string {
    return Array.from(text, char => {
        const plain = char.normalize("NFD").replace(/[̀-ͯ]/g, "");
        return plain.length === 1 ? plain : char;
    }).join("");
}
