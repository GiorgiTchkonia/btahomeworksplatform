const path=require('node:path');
const assert=require('node:assert/strict');
const {describe,test}=require('../helpers/test-utils.cjs');
const load=require('../helpers/load-typescript.cjs');
const {localizeError,MIN_PASSWORD_LENGTH}=load(path.join(__dirname,'../../src/lib/messages.ts'),{});
describe('Production Georgian error messages and password policy',()=>{
  test('Provider password errors describe the eight-character rule',()=>{
    assert.equal(MIN_PASSWORD_LENGTH,8);
    assert.match(localizeError({code:'weak_password',message:'Password should be at least 8 characters.'}),/8 სიმბოლოს/);
  });
  test('Reused password and invalid credentials have Georgian feedback',()=>{
    assert.match(localizeError(new Error('New password should be different from the old password.')),/განსხვავდებოდეს/);
    assert.match(localizeError({code:'invalid_credentials'}),/ელფოსტა ან პაროლი არასწორია/);
  });
  test('Unknown database diagnostics are not leaked as English UI text',()=>{
    assert.equal(localizeError(new Error('relation secret_internal_table does not exist'),'შეცდომა მოხდა'),'შეცდომა მოხდა');
  });
  test('Existing Georgian validation messages are preserved',()=>{
    assert.equal(localizeError('სტუდენტისთვის ჯგუფის არჩევა სავალდებულოა.'),'სტუდენტისთვის ჯგუფის არჩევა სავალდებულოა.');
  });
  test('Rate limiting and connection errors are localized',()=>{
    assert.match(localizeError({status:429}),/ძალიან ხშირია/);
    assert.match(localizeError(new Error('Failed to fetch')),/კავშირი ვერ დამყარდა/);
  });
});
