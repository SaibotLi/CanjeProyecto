import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const migrations=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../migrations');

test('CanjeProyecto migrations do not issue managed Storage ACLs or modify its DDL', () => {
  for(const name of fs.readdirSync(migrations).filter(name=>name.endsWith('.sql'))) {
    // Reviewed migrations contain static SQL; ignore prose comments in this
    // provenance check. Effective app permissions and function bodies retain
    // their independent DB inventories in 04/05/06, not inferred by this test.
    const sql=fs.readFileSync(path.join(migrations,name),'utf8').replace(/--[^\r\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'');
    assert.doesNotMatch(sql,/\b(?:grant|revoke)\b[^;]*\bstorage\b/i,`${name}: managed Storage grants/grantees/grant options belong to Supabase`);
    assert.doesNotMatch(sql,/\balter\s+default\s+privileges\b[^;]*\bstorage\b/i,`${name}: no managed Storage default ACL edits`);
    assert.doesNotMatch(sql,/\bgrant\s+\w+\s+to\b/i,`${name}: no indirect role grants`);
    assert.doesNotMatch(sql,/\b(?:alter|drop|truncate)\s+(?:(?:table|function|schema|trigger|index|view)\s+)?(?:if\s+exists\s+)?"?storage"?\b/i,`${name}: no managed Storage DDL`);
    assert.doesNotMatch(sql,/\bcreate\s+(?:or\s+replace\s+)?(?:table|function|schema|trigger|index|view)\s+"?storage"?\b/i,`${name}: no managed Storage objects`);
  }
});
