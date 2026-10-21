const path = require('node:path');
const assert = require('node:assert/strict');
const { describe, test } = require('../helpers/test-utils.cjs');
const load = require('../helpers/load-typescript.cjs');

function setup(result) {
  const calls = [];
  const query = {
    update(payload) { calls.push({ update: payload }); return query; },
    eq(key,value) { calls.push({ eq: [key,value] }); return query; },
    in(key,value) { calls.push({ in: [key,Array.from(value)] }); return query; },
    async select() { return result; },
  };
  const api = load(path.join(__dirname,'../../src/lib/groups.ts'), { './supabase': { supabase: { from(table) { assert.equal(table,'profiles'); return query; } } } });
  return { api, calls };
}
describe('Production manual student group membership', () => {
  test('Only the manually selected student IDs are transferred in one request', async () => {
    const {api,calls}=setup({data:[{id:'one'},{id:'two'}],error:null});
    await api.assignStudentsToGroup('target',['one','two','one']);
    assert.equal(calls.length,3); assert.equal(calls[0].update.group_id,'target');
    assert.equal(calls[1].eq.join(','),'role,STUDENT');
    assert.equal(calls[2].in[1].join(','),'one,two');
  });
  test('No automatic enrollment happens when no students are selected', async () => {
    const {api,calls}=setup({data:[],error:null});
    await assert.rejects(api.assignStudentsToGroup('target',[]),/აირჩიეთ/); assert.equal(calls.length,0);
  });
  test('Membership write errors never produce success', async () => {
    const {api}=setup({data:null,error:new Error('permission denied')});
    await assert.rejects(api.assignStudentsToGroup('target',['one']),/permission denied/);
  });
  test('A stale or incomplete selection is reported for refresh', async () => {
    const {api}=setup({data:[{id:'one'}],error:null});
    await assert.rejects(api.assignStudentsToGroup('target',['one','deleted']),/განაახლეთ/);
  });
});
