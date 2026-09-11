export function qtyDiff(r) {
    const expected = r.quantities.requested;
    const verified = r.quantities.verified || 0;
    if (r.receivedQty != null)
        return r.receivedQty - (r.expectedQty || expected);
    if (verified)
        return verified - expected;
    return 0;
}
export function formatDiff(n) {
    if (n === 0)
        return '0';
    return n > 0 ? `+${n}` : String(n);
}
export function manifestLabel(status) {
    const s = status.toUpperCase();
    if (s === 'DRAFT')
        return 'Prepared';
    if (s === 'IN_TRANSIT')
        return 'In Transit';
    if (s === 'DELIVERED')
        return 'Received';
    if (s === 'CLOSED')
        return 'Closed';
    if (s.includes('DISPATCH'))
        return 'Dispatched';
    return status;
}
