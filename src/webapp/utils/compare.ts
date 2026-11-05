/**
 * The order the Angular app used for names (`orderBy`): case-insensitive, by character code, and
 * counting spaces at the start of a name, which are not displayed but count for the order.
 */
export function compareNames(a: string, b: string): number {
    const [x, y] = [a.toLowerCase(), b.toLowerCase()];
    return x < y ? -1 : x > y ? 1 : 0;
}
