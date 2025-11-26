import {NilObj, Obj, ObjectProto} from "./obj.ts";

export const StringProto = new Obj("StringProto",ObjectProto,{
    'value':(rec:Obj) => rec,
    '+':((rec:Obj, args:Array<Obj>) => StrObj(rec.to_string() + args[0].to_string())),
    'print':(rec:Obj):Obj => {
        console.log("PRINT",rec._get_js_string())
        return NilObj()
    }
});
export const StrObj = (value:string):Obj => new Obj("StringLiteral", StringProto, {'jsvalue': value})

