/*
 * Removes newlines and excessive whitespace
 */
export function trim(value: TemplateStringsArray) {
    return value[0].replace(/\n/g, '').replace(/[\s]{2,}/g, ' ');
}
