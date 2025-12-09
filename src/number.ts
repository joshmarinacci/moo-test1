import {NatMeth, NilObj, Obj, ObjectProto} from "./obj.ts";
import {eval_block_obj} from "./eval.ts";
import {BoolObj} from "./boolean.ts";
import {StrObj} from "./string.ts";
import type {NativeMethodSigature} from "./obj.ts"

const js_num_op = (cb:(a:number,b:number)=>number):NativeMethodSigature => {
    return function (rec:Obj, args:Array<Obj>){
        if (args[0].name !== "NumberLiteral") {
            throw new Error(`cannot add a non number to a number: ${args[0].name}`);
        }
        let a = rec._get_js_number()
        let b = args[0]._get_js_number()
        return NumObj(cb(a, b))
    }
}
const js_bool_op = (cb:(a:number,b:number)=>boolean) => {
    return function (rec:Obj, args:Array<Obj>){
        if (!args[0].is_kind_of('NumberProto')) {
            throw new Error(`argument not a number ${args[0].name}`)
        }
        return BoolObj(cb(rec._get_js_number(), args[0]._get_js_number()))
    }
}
const NumberProto = new Obj("NumberProto",ObjectProto,{
    'value':(rec:Obj) => rec,
    '+':js_num_op((a,b)=>a+b),
    '-':js_num_op((a,b)=>a-b),
    '*':NatMeth(js_num_op((a,b)=>a*b)),
    '/':NatMeth( js_num_op((a,b)=>a/b)),
    '<':js_bool_op((a,b)=>a<b),
    '>':js_bool_op((a,b)=>a>b),
    '==':(rec:Obj,args:Array<Obj>) => {
        if (!args[0].is_kind_of('NumberProto')) {
            return BoolObj(false)
        } else {
            if(rec._get_js_number() == args[0]._get_js_number()) {
                return BoolObj(true)
            }
        }
        return BoolObj(false)
    },
    'mod:':js_num_op((a,b)=>a%b),
    'sqrt':(rec:Obj):Obj => NumObj(Math.sqrt(rec._get_js_number())),
    'range:do:':(rec:Obj, args:Array<Obj>):Obj => {
        let start = rec._get_js_number()
        let end = args[0]._get_js_number()
        let block = args[1]
        for(let i=start; i<end; i++) {
            eval_block_obj(block, [NumObj(i)])
        }
        return NilObj()
    },
    'print':(rec:Obj):Obj => {
        return StrObj(rec._get_js_number()+'')
    },
    'negate':(rec:Obj):Obj => {
        return NumObj(-rec._get_js_number())
    }
});
export const NumObj = (value:number):Obj => new Obj("NumberLiteral", NumberProto, { 'jsvalue': value,})

export function setup_number(scope: Obj) {
    scope._make_method_slot("Number", NumberProto)
}