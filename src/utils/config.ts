const num = (v: any, def: number) => {
  const n = Number(v);
  return isFinite(n) && !isNaN(n) ? n : def;
};

export const COMMISSION_PERCENT = num(process.env.COMMISSION_PERCENT, 0.1);

export const commissionNet = (gross: number) => {
  const net = gross * (1 - COMMISSION_PERCENT);
  return Math.round(net * 100) / 100;
};

export default {
  COMMISSION_PERCENT,
  commissionNet,
};