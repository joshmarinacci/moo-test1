import JSDOM from "jsdom"
import test from "node:test";
import {sval} from "../src/eval.ts";
import {make_browser_scope} from "../src/browser.ts";

test('dom test',() => {
    const { document } = (new JSDOM.JSDOM()).window;
    let scope = make_browser_scope(document)
    sval(`[
        Global makeSlot: "dom" with: (DomProxy clone).
        dom init.
     ] value.`,scope)
    sval(`dom make: 'div'.`,scope)
})
