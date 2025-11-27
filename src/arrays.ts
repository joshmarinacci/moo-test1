import {NilObj, Obj, ObjectProto} from "./obj.ts";
import {NumObj} from "./number.ts";
import {eval_block_obj} from "./eval.ts";

export const ListProto = new Obj("ListProto",ObjectProto, {
    'add:':(rec:Obj, args:Array<Obj>):Obj=>{
        let arr = rec._get_js_array()
        arr.push(args[0]);
        return NilObj()
    },
    'at:':(rec:Obj,args:Array<Obj>):Obj => {
        let arr = rec._get_js_array()
        let index = args[0]._get_js_number()
        return arr[index]
    },
    'setAt:':(rec:Obj, args:Array<Obj>):Obj => {
        let arr = rec._get_js_array()
        let index = args[0]._get_js_number()
        arr[index] = args[1]
        return rec
    },
    'size':(rec:Obj, args:Array<Obj>):Obj=>{
        let arr = rec._get_js_array()
        return NumObj(arr.length)
    },
    'do:':(rec:Obj, args:Array<Obj>):Obj=>{
        let arr = rec._get_js_array()
        let block = args[0]
        arr.forEach((v,i) => {
            let ret = eval_block_obj(block,[v]) as Obj
        })
        return NilObj()
    },
    'select:':(rec:Obj, args:Array<Obj>):Obj=>{
        let arr = rec._get_js_array()
        let block = args[0]
        let res = arr.map((v,i) => {
            return eval_block_obj(block,[v]) as Obj
        }).filter(b => b._get_js_boolean())
        return ListObj(...res)
    },
    'reject:':(rec:Obj, args:Array<Obj>):Obj=>{
        let arr = rec._get_js_array()
        let block = args[0]
        let res = arr.map((v,i) => {
            return eval_block_obj(block,[v]) as Obj
        }).filter(b => !b._get_js_boolean())
        return ListObj(...res)
    },
    'collect:':(rec:Obj, args:Array<Obj>):Obj=>{
        let arr = rec._get_js_array()
        let block = args[0]
        let res = arr.map((v,i) => {
            return eval_block_obj(block,[v]) as Obj
        });
        return ListObj(...res)
    },
})
ListProto._make_js_slot('jsvalue',[])
export const ListObj = (...args:Array<Obj>)=> new Obj("List", ListProto, {'jsvalue': args})

export const DictProto = new Obj('DictProto',ObjectProto, {
    'get':(rec:Obj, args:Array<Obj>):Obj => {
        let arr = rec._get_js_record()
        let key = args[0]._get_js_string()
        return arr[key]
    },
    'set':(rec:Obj, args:Array<Obj>):Obj => {
        let arr = rec._get_js_record()
        let key = args[0]._get_js_string()
        arr[key] = args[1]
        return rec
    },
    'len':(rec):Obj=>{
        let record = rec._get_js_record()
        return NumObj(Object.keys(record).length)
    }
})
DictProto._make_js_slot("jsvalue",{})
export const DictObj = (obj:Record<string, Obj>) => new Obj("Dict",DictProto,{"jsvalue": obj})


export function setup_arrays(scope:Obj) {
    scope._make_method_slot("List",ListProto)
    scope._make_method_slot("Dict",DictProto)
}


