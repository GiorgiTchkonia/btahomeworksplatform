const path = require('node:path');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { describe, test } = require('../helpers/test-utils.cjs');
const load = require('../helpers/load-typescript.cjs');
const icons = { Check: props => React.createElement('svg', { ...props, 'data-checkmark': true }) };
const reactModule = { ...React, default: React };
const Checkbox = load(path.join(__dirname,'../../src/components/ui/CustomCheckbox.tsx'), { react: reactModule, 'lucide-react': icons }).default;
const FormatPicker = load(path.join(__dirname,'../../src/components/FileFormatPicker.tsx'), { react: reactModule, 'lucide-react': require('lucide-react'), './ui/CustomCheckbox': { default: Checkbox } }).default;
describe('Production college form controls', () => {
  test('Checked checkbox renders a visible checkmark and keyboard focus styling', () => {
    const html = renderToStaticMarkup(React.createElement(Checkbox, { checked: true, onChange() {}, label: 'PDF' }));
    assert.match(html, /checked=""/); assert.match(html, /data-checkmark/); assert.match(html, /bg-indigo-600/); assert.match(html, /peer-focus-visible/);
  });
  test('Unchecked checkbox does not render a misleading checkmark', () => {
    const html = renderToStaticMarkup(React.createElement(Checkbox, { checked: false, onChange() {}, label: 'PDF' }));
    assert.doesNotMatch(html, /data-checkmark|checked=""/);
  });
  test('Word is checked both for existing CSV settings and new flat extension arrays', () => {
    for (const selected of [['.doc,.docx'],['.doc','.docx']]) {
      const html = renderToStaticMarkup(React.createElement(FormatPicker, { selected, onChange() {} }));
      assert.equal((html.match(/checked=""/g) || []).length,1);
    }
  });
});
