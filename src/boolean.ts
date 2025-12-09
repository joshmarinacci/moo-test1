import {NatMeth, NilObj, Obj, ObjectProto} from "./obj.ts";
import {eval_block_obj} from "./eval.ts";
import {StrObj} from "./string.ts";

const BooleanProto = new Obj("BooleanProto",ObjectProto,{
    'value':(rec:Obj) => rec,
    'ifTrue:':NatMeth((rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        if(val) return eval_block_obj(args[0],[])
        return NilObj()
    }),
    'ifFalse:':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        if(!val) return eval_block_obj(args[0],[])
        return NilObj()
    },
    'ifTrue:ifFalse:':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        if(val) {
            return eval_block_obj(args[0],[])
        } else {
            return eval_block_obj(args[1],[])
        }
    },
    'and:':(rec:Obj, args:Array<Obj>):Obj => {
        let A = rec._get_js_boolean()
        let B = args[0]._get_js_boolean()
        return BoolObj(A && B)
    },
    'or:':(rec:Obj, args:Array<Obj>):Obj => {
        let A = rec._get_js_boolean()
        let B = args[0]._get_js_boolean()
        return BoolObj(A || B)
    },
    'not':(rec:Obj, args:Array<Obj>):Obj => {
        let A = rec._get_js_boolean()
        return BoolObj(!A)
    },
    'cond:with:':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        return eval_block_obj(val?args[0]:args[1],[])
    },
    'print':(rec:Obj):Obj => {
        return StrObj(rec._get_js_boolean()+'')
    },
    '==':(rec:Obj,args:Array<Obj>) => {
        if (!args[0].is_kind_of('BooleanProto')) {
            return BoolObj(false)
        } else {
            if(rec._get_js_boolean() == args[0]._get_js_boolean()) {
                return BoolObj(true)
            }
        }
        return BoolObj(false)
    },

});
export const BoolObj = (value:boolean) => new Obj("BooleanLiteral", BooleanProto, {'jsvalue':value})

export function setup_boolean(scope: Obj) {
    scope._make_method_slot("Boolean", BooleanProto)
    scope._make_method_slot("true",BoolObj(true))
    scope._make_method_slot("false",BoolObj(false))
}