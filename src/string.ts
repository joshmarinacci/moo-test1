import {NilObj, Obj, ObjectProto} from "./obj.ts";
import {BoolObj} from "./boolean.ts";

export const StringProto = new Obj("StringProto",ObjectProto,{
    'value':(rec:Obj) => rec,
    '+':((rec:Obj, args:Array<Obj>) => StrObj(rec.to_string() + args[0].to_string())),
    '==':(rec:Obj,args:Array<Obj>) => {
        if (!args[0].is_kind_of('StringProto')) {
            return BoolObj(false)
        } else {
            if(rec._get_js_string() == args[0]._get_js_string()) {
                return BoolObj(true)
            }
        }
        return BoolObj(false)
    },
    'print':(rec:Obj):Obj => {
        return StrObj(rec._get_js_string())
    }
});
export const StrObj = (value:string):Obj => new Obj("StringLiteral", StringProto, {'jsvalue': value})

