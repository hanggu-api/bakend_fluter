"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionNet = exports.COMMISSION_PERCENT = void 0;
const num = (v, def) => {
    const n = Number(v);
    return isFinite(n) && !isNaN(n) ? n : def;
};
exports.COMMISSION_PERCENT = num(process.env.COMMISSION_PERCENT, 0.1);
const commissionNet = (gross) => {
    const net = gross * (1 - exports.COMMISSION_PERCENT);
    return Math.round(net * 100) / 100;
};
exports.commissionNet = commissionNet;
exports.default = {
    COMMISSION_PERCENT: exports.COMMISSION_PERCENT,
    commissionNet: exports.commissionNet,
};
