import {NilObj, Obj, ObjectProto} from "./obj.ts";
import {eval_block_obj} from "./eval2.ts";

export const BooleanProto = new Obj("BooleanProto",ObjectProto,{
    'value':(rec:Obj) => rec,
    'if_true':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        if(val) return eval_block_obj(args[0],[])
        return NilObj()
    },
    'if_false':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        if(!val) return eval_block_obj(args[0],[])
        return NilObj()
    },
    'and':(rec:Obj, args:Array<Obj>):Obj => {
        let A = rec._get_js_boolean()
        let B = args[0]._get_js_boolean()
        return BoolObj(A && B)
    },
    'cond':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        return eval_block_obj(val?args[0]:args[1],[])
    }
});
export const BoolObj = (value:boolean) => new Obj("BooleanLiteral", BooleanProto, {'jsvalue':value})

