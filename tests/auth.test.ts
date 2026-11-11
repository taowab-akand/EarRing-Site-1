import test from 'node:test';
import assert from 'node:assert/strict';
import {authenticationStage,diagnostic,AdminAccessError,authMessages} from '../lib/auth-errors.ts';
test('credentials are distinct from other provider failures',()=>{
  assert.equal(authenticationStage('invalid_credentials'),'credentials');
  assert.equal(authenticationStage('email_not_confirmed'),'authentication');
  assert.equal(authenticationStage(undefined),'authentication');
});
test('session, permission and database failures remain distinct',()=>{
  for(const stage of ['session','permission','database'] as const){
    assert.equal(new AdminAccessError(stage).stage,stage);
    assert.ok(authMessages[stage]);
  }
});
test('diagnostics never log provider messages, passwords or tokens',()=>{
  const original=console.error;let output='';
  console.error=(...args)=>{output=JSON.stringify(args);};
  try {
    const reference=diagnostic('authentication',{code:'invalid_credentials',status:400,message:'SECRET',password:'SECRET',access_token:'SECRET'});
    assert.match(reference,/^[a-f0-9-]{36}$/);
    assert.ok(output.includes('invalid_credentials'));
    assert.ok(!output.includes('SECRET'));
  } finally {console.error=original;}
});
