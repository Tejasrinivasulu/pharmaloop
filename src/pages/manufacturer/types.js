/** Compliance workflow — never skip to a simple "destroyed → closed". */
export const DISPOSAL_WORKFLOW = [
    'Disposal Completed',
    'Evidence Submitted',
    'Quantity Reconciled',
    'Certificate Linked',
    'Verification',
    'DESTRUCTION VERIFIED',
    'CLOSED',
];
export function workflowStepIndex(ret) {
    if (ret.closed || ret.status === 'CLOSED')
        return 6;
    if (ret.destructionVerified || ret.status === 'DESTRUCTION_VERIFIED')
        return 5;
    if (ret.quantityReconciled || ret.status === 'QUANTITY_RECONCILED')
        return 4;
    if (ret.status === 'EVIDENCE_SUBMITTED' || (ret.evidence && !ret.quantityReconciled))
        return 2;
    if (ret.disposalCompleted || ret.status === 'DISPOSAL_COMPLETED')
        return 1;
    if (ret.status === 'DISPOSAL_REQUESTED')
        return 0;
    return -1;
}
export function verificationGateLabel(ret) {
    if (ret.closed || ret.status === 'CLOSED') {
        return { label: 'CLOSED', tone: 'success' };
    }
    if (ret.destructionVerified || ret.status === 'DESTRUCTION_VERIFIED') {
        return { label: 'DESTRUCTION VERIFIED', tone: 'success' };
    }
    if (ret.discrepancy) {
        return { label: 'Discrepancy — Cannot Close', tone: 'danger' };
    }
    if (ret.disposalCompleted && !ret.evidence) {
        return { label: 'Disposal Claimed — Verification Pending', tone: 'warning' };
    }
    if (ret.evidence && !ret.quantityReconciled) {
        return { label: 'Evidence on file — Reconcile quantity', tone: 'info' };
    }
    if (ret.quantityReconciled && !ret.destructionVerified) {
        return { label: 'Ready for destruction verification', tone: 'info' };
    }
    return { label: prettyGate(ret.status), tone: 'info' };
}
function prettyGate(status) {
    return status.replaceAll('_', ' ');
}
