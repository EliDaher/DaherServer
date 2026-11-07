"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportError = void 0;
exports.normalizeReport = normalizeReport;
exports.applyReportChange = applyReportChange;
class ReportError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.ReportError = ReportError;
const text = (value) => typeof value === "string" ? value.trim() : "";
function normalizeReport(id, record) {
    return Object.assign(Object.assign({}, record), { id, number: text(record.number), company: text(record.company), note: text(record.note), createdAt: text(record.createdAt), status: record.status === "done" ? "done" : "active", history: record.history || {} });
}
function applyReportChange(records, id, input, creating, at, eventId) {
    if (!creating && !records[id])
        throw new ReportError(404, "Report not found");
    const previous = creating ? null : normalizeReport(id, records[id]);
    const next = previous ? Object.assign({}, previous) : {
        id, number: "", company: "", note: "", status: "active", createdAt: at,
        createdBy: text(input.createdBy), history: {},
    };
    for (const field of ["number", "company", "note"]) {
        if (creating || Object.prototype.hasOwnProperty.call(input, field))
            next[field] = text(input[field]);
    }
    if (input.status !== undefined) {
        if (input.status !== "active" && input.status !== "done")
            throw new ReportError(400, "Invalid status");
        next.status = input.status;
    }
    if (creating)
        next.status = "active";
    if (!next.number || !next.company)
        throw new ReportError(400, "number and company are required");
    const key = (r) => `${text(r.number)}::${text(r.company).toLowerCase()}`;
    if (next.status === "active" && Object.entries(records).some(([otherId, r]) => otherId !== id && normalizeReport(otherId, r).status === "active" && key(r) === key(next))) {
        throw new ReportError(409, "An active reported transaction already exists");
    }
    const changes = {};
    for (const field of ["number", "company", "note", "status"]) {
        const before = previous ? previous[field] : "";
        if (before !== next[field])
            changes[field] = { before, after: next[field] };
    }
    if (!creating && !Object.keys(changes).length)
        return records;
    const user = text(creating ? input.createdBy : input.updatedBy);
    const statusChanged = previous && previous.status !== next.status;
    if (statusChanged && next.status === "done") {
        next.completedAt = at;
        next.completedBy = user;
    }
    if (statusChanged && next.status === "active") {
        delete next.completedAt;
        delete next.completedBy;
    }
    next.updatedAt = at;
    next.history = Object.assign(Object.assign({}, next.history), { [eventId]: { id: eventId, at, user,
            action: creating ? "created" : statusChanged ? (next.status === "done" ? "done" : "reopened") : "edited", changes } });
    return Object.assign(Object.assign({}, records), { [id]: next });
}
