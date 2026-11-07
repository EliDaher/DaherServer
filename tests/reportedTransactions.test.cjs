const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyReportChange: apply, ReportError } = require('../dist/services/reportedTransactions');
const create = () => apply({}, 'a', {number:'123',company:'Test',note:'old',createdBy:'alice'}, true, '2026-01-01', 'e1');
test('creation, edits, completion, reopen preserve append-only history', () => {
 let records = create();
 records = apply(records,'a',{note:'',updatedBy:'bob'},false,'2026-01-02','e2');
 assert.deepEqual(records.a.history.e2.changes.note,{before:'old',after:''});
 assert.equal(records.a.createdBy,'alice');
 records = apply(records,'a',{status:'done',updatedBy:'bob'},false,'2026-01-03','e3');
 assert.equal(records.a.completedBy,'bob');
 assert.equal(apply(records,'a',{status:'done'},false,'later','noop'),records);
 records = apply(records,'a',{number:'456'},false,'2026-01-04','e4');
 records = apply(records,'a',{status:'active'},false,'2026-01-05','e5');
 assert.equal(records.a.completedAt,undefined);
 assert.equal(Object.keys(records.a.history).length,5);
 assert.equal(records.a.history.e1.action,'created');
});
test('active duplicate conflicts, completed reports allow new reports, reopen conflicts', () => {
 let records=create();
 assert.throws(()=>apply(records,'b',{number:'123',company:'test'},true,'t','e'),e=>e.status===409);
 records=apply(records,'a',{status:'done'},false,'t','done');
 records=apply(records,'b',{number:'123',company:'test'},true,'t','new');
 assert.throws(()=>apply(records,'a',{status:'active'},false,'t','reopen'),e=>e.status===409);
 assert.equal(records.a.status,'done');
 assert.equal(records.a.history.reopen,undefined);
});
test('legacy records, validation and retry against latest state', () => {
 let records={a:{number:'123',company:'Test',createdAt:'old',createdBy:'alice'}};
 records=apply(records,'a',{note:'first'},false,'t','one');
 records=apply(records,'a',{company:'Other'},false,'t2','two');
 assert.equal(records.a.note,'first');
 assert.equal(records.a.createdAt,'old');
 assert.equal(Object.keys(records.a.history).length,2);
 assert.throws(()=>apply(records,'missing',{},false,'t','e'),e=>e.status===404);
 assert.throws(()=>apply(records,'a',{number:' '},false,'t','e'),e=>e.status===400);
 assert.throws(()=>apply(records,'a',{status:'bad'},false,'t','e'),e=>e.status===400);
 assert.equal(records.a.history.e,undefined);
});
