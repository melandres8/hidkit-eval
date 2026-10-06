// A where clause maps a field to a value, to { in: [values] }, or to { contains: text }.
function test(actual, condition) {
  if (condition !== null && typeof condition === 'object') {
    if ('in' in condition) return condition.in.includes(actual);
    if ('contains' in condition) return String(actual ?? '').toLowerCase().includes(String(condition.contains).toLowerCase());
    return false;
  }
  return actual === condition;
}

export const matches = (row, where = {}) => Object.entries(where).every(([field, condition]) => test(row[field], condition));
