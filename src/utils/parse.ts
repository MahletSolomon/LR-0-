
const SINGLE = new Set(["(", ")", "+", "*", "-", "/", "[", "]"]);



export function splitGrammar(str: string): string[] {
    return str.split("|")
        .map((s) => s.trim())
        .filter(s => s.length > 0 || s === "");
}

export function getTokens(str: string): string[] {
    const tokens: string[] = []
    const isVar = (c: string) =>
        (c >= "a" && c <= "z") ||
        (c >= "A" && c <= "Z") ||
        (c >= "0" && c <= "9") ||
        c === "_" ||
        c === "'";

    let i = 0;
    while (i < str.length) {

        if (str[i] === " " || str[i] === "\t" || str[i] === "\n" || str[i] === "\r") {
            i++;
            continue;
        }

        if (SINGLE.has(str[i])) {
            tokens.push(str[i]);
            i++;
            continue;
        }

        if (isVar(str[i])) {
            let j = i + 1;
            while (j < str.length && isVar(str[j])) {
                j++;
            }
            tokens.push(str.substring(i, j));
            i = j;
            continue;
        }
    }

    return tokens;
}

export const tokenizeRhsTolerant = getTokens;






