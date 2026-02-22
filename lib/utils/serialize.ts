import { Timestamp } from 'firebase-admin/firestore';

/**
 * Firestore DocumentData をシリアライズ可能なプレーンオブジェクトに変換する
 * Timestamp型はISO文字列に変換される
 */
export function serializeDoc<T = any>(data: any): T {
    if (!data || typeof data !== 'object') return data;

    const serializeValue = (val: any): any => {
        if (!val) return val;
        if (val instanceof Timestamp) return val.toDate().toISOString();
        if (val instanceof Date) return val.toISOString();
        if (Array.isArray(val)) return val.map(serializeValue);
        if (typeof val === 'object') {
            const res: any = {};
            for (const key in val) {
                res[key] = serializeValue(val[key]);
            }
            return res;
        }
        return val;
    };

    return serializeValue(data);
}
