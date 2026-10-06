// The key of a plate: upper case, with spaces and dashes removed. See docs/plates.md.
export const plateKey = (text) => text.toUpperCase().replace(/[\s-]+/g, '');
