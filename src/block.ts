import {NatMeth, NilObj, Obj, ObjectProto} from "./obj.ts";
import {AstToSource, } from "./ast.ts";
import type {Statement, PlainId} from "./ast.ts"
import {StrObj} from "./string.ts";
import {eval_ast} from "./eval.ts";
import {JoshLogger} from "./util.ts";

const d = new JoshLogger()
d.disable()

let BLOCK_COUNT = 0
class ActivationObj extends Obj {
    constructor(name:string, parent:Obj, props:Record<string,unknown>) {
        super(name,parent,props)
    }
    lookup_slot(name: string): Obj {
        if(name === 'self') {
            return this.parent.parent
        }
        return super.lookup_slot(name);
    }
}
export const BlockProto = new Obj("BlockProto", ObjectProto, {
    'print': NatMeth((rec: Obj) => {
        let body = rec.get_js_slot('body') as Array<Statement>
        return StrObj(body.map(st => AstToSource(st)).join('\n'))
    }),
    'value': NatMeth((rec: Obj, args: Array<Obj>) => {
        d.p("inside of the block")
        let params: Array<PlainId> = rec.get_slot('args') as unknown as Array<PlainId>
        let body = rec.get_js_slot('body') as Array<Statement>
        if (!Array.isArray(body)) throw new Error("block body isn't an array")
        let scope = new ActivationObj(`block-activation-${++BLOCK_COUNT}`, rec, {})
        if (params.length !== args.length) {
            console.warn("parameters and args for block are different lengths")
            console.log(rec.print())
            throw new Error(`block requires ${params.length} arguments. sending ${args.length}\n ${rec.print()}`)
        }
        d.p("params", params)
        for (let i = 0; i < params.length; i++) {
            d.p("param", params[i], args[i])
            scope._make_method_slot(params[i].name, args[i])
        }
        let last = NilObj()
        for (let ast of body) {
            last = eval_ast(ast, scope)
            if (!last) last = NilObj()
            if (last.name === 'SymbolReference') {
                last = scope.lookup_slot(last._get_js_string())
            }
            if (last._is_return) {
                let target: Obj = last._method_slots.get('target')
                if (target === scope) {
                    // d.p("fast return found. returning",last.slots.get('value'))
                    return last._method_slots.get('value') as Obj
                }
                if (target && target.parent === scope) {
                    // d.p("fast return through parent found. returning",last.slots.get('value'))
                    return last._method_slots.get('value') as Obj
                }
                return last
            }
        }
        return last
    })
})