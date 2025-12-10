import JSDOM from "jsdom"
import test from "node:test";
import {sval} from "../src/eval.ts";
import {make_browser_scope} from "../src/browser.ts";
import {mval} from "./eval.test.ts";

test('dom test',() => {
    const { document } = (new JSDOM.JSDOM()).window;
    let scope = make_browser_scope(document)
    mval(`
        Global makeSlot: "dom" with: (DomProxy clone).
        dom init.
        
        dom make: 'div'.
        dom clear.
        
        d1 := (dom make: 'div').
        d2 := (dom make: 'div').
        
        d2 append: d1.
        
        d2 innerHtml: "foo".
        Debug equals: (d2 innerHtml) with: "foo".
        
        d2 clear.
        Debug equals: (d2 innerHtml) with: "".
     `,scope)
    sval(`dom clear.`,scope)
})
