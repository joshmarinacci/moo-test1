import {InputStream} from "../src/parser.ts";
import type { Rule} from "../src/parser.ts"

export function match(source:string, rule:Rule) {
    let input = new InputStream(source,0);
    return rule(input).succeeded()
}
