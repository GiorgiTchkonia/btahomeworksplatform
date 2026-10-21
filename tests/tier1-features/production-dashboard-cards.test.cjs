const path = require('node:path');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { describe, test } = require('../helpers/test-utils.cjs');
const load = require('../helpers/load-typescript.cjs');
const react = { ...React, default: React };
const Card = load(path.join(__dirname, '../../src/components/StudentAssignmentCard.tsx'), {
  react, 'lucide-react': require('lucide-react'),
  './DashboardDialog': { default: ({children}) => children },
  './StorageFileButton': { default: ({children}) => React.createElement('button', null, children) },
}).default;
const assignment = { id:'a', title:'ლიტერატურული დავალება', description:'LONG_PRIVATE_DESCRIPTION', subjectName:'ქართული', dueDate:'2030-01-01', submission:null };
const render = (submission, dueDate = assignment.dueDate) => renderToStaticMarkup(React.createElement(Card, { assignment:{...assignment, submission, dueDate}, now:Date.parse('2026-10-22'), onSubmit(){}, onCancel(){} }));
describe('Production dashboard assignment actions', () => {
  test('Unsubmitted work retains submit action without flooding the card with descriptions', () => {
    const html = render(null); assert.match(html, /დავალების ჩაბარება/); assert.match(html, /ლიტერატურული დავალება/); assert.doesNotMatch(html, /LONG_PRIVATE_DESCRIPTION/);
  });
  for (const status of ['APPROVED','SUBMITTED','DECLINED']) test(`${status} has a view action`, () => {
    const html=render({status,grade:status==='APPROVED'?8:null}); assert.match(html, /დავალების ნახვა/); assert.doesNotMatch(html, /LONG_PRIVATE_DESCRIPTION/);
  });
  test('Returned work retains resubmission only before the deadline', () => {
    assert.match(render({status:'DECLINED'}), /ხელახლა ჩაბარება/);
    assert.doesNotMatch(render({status:'DECLINED'},'2020-01-01'), /ხელახლა ჩაბარება/);
  });
  test('Overdue unsubmitted work is viewable and cannot be submitted', () => {
    const html=render(null,'2020-01-01'); assert.match(html,/დავალების ნახვა/); assert.match(html,/ვადაგასულია/); assert.doesNotMatch(html,/დავალების ჩაბარება/);
  });
  test('Teacher roster opens the clicked student and can hide or compact the list', () => {
    const states = [true, true, false]; let index = 0, clicked;
    const hookReact = { ...React, useState: initial => { const i=index++; if (states[i]===undefined) states[i]=initial; return [states[i], value=>{states[i]=value;}]; } };
    const Panel = load(path.join(__dirname, '../../src/components/TeacherGroupsPanel.tsx'), {
      react: {...hookReact, default:hookReact}, 'lucide-react':require('lucide-react'), '@/lib/groups':{programmeLabel:()=> 'ინტეგრირებული'},
    }).default;
    const student = {id:'student-1',name:'გიორგი',submitted:1,missing:1,approved:1,pending:0,declined:0};
    const props = {groups:[{id:'g',code:'I14-25/1',active:true}],selected:'g',onChange(){},roster:[student],onStudent:s=>{clicked=s.id;}};
    const buttons = node => { if (!node || typeof node!=='object') return []; if (Array.isArray(node)) return node.flatMap(buttons); return [...(node.type==='button'?[node]:[]),...buttons(node.props?.children)]; };
    const draw = () => { index=0; return Panel(props); };
    let tree=draw();
    buttons(tree).find(b=>b.props['aria-label']==='გიორგი — ჩაბარებული დავალებები').props.onClick();
    assert.equal(clicked,'student-1');
    buttons(tree).find(b=>b.props['aria-controls']==='teacher-roster').props.onClick();
    tree=draw(); assert.match(renderToStaticMarkup(tree), /id="teacher-roster" hidden=""/);
    buttons(tree).find(b=>b.props['aria-pressed']===false && b.props.children==='კომპაქტური სია').props.onClick();
    tree=draw(); assert.match(renderToStaticMarkup(tree), /სრული სია/);
    buttons(tree).find(b=>b.props['aria-controls']==='teacher-group-picker').props.onClick();
    assert.match(renderToStaticMarkup(draw()), /id="teacher-group-picker" hidden=""/);
  });
});
