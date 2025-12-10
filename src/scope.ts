import {NativeMethodProto, NatMeth, NilObj, Obj, ObjectProto, ROOT, setup_object} from "./obj.ts";
import {setup_number} from "./number.ts";
import {BoolObj, setup_boolean} from "./boolean.ts";
import {DictObj, ListObj, setup_arrays} from "./arrays.ts";
import {setup_debug} from "./debug.ts";
import {StrObj} from "./string.ts";

function root_fixup(scope:Obj) {
    ROOT._make_method_slot('listSlotNames',NatMeth((rec:Obj, args:Array<Obj>):Obj => {
        let names = rec._list_slot_names().map(name => StrObj(name))
        return ListObj(...names)
    }))
    ROOT._make_method_slot('getSlotNames',NatMeth((rec:Obj, args:Array<Obj>):Obj => {
        let slots:Record<string, Obj> = {}
        rec._list_slot_names().forEach(name => {
            slots[name] = rec.get_slot(name)
        })
        return DictObj(slots)
    }))
    ROOT._make_method_slot('print',NatMeth((rec:Obj):Obj => StrObj(rec.print())))
    NativeMethodProto._make_method_slot('print', NatMeth((rec: Obj, args: Array<Obj>) => {
        return StrObj('native-method')
    }))
    ROOT._make_method_slot('isNil',NatMeth((rec:Obj):Obj => BoolObj(false)))
    ROOT._make_method_slot('jsSet:on:with:',NatMeth((rec:Obj, args:Array<Obj>):Obj => {
        let field_name = args[0]._get_js_string()
        let js_target = args[1]
        let value = args[2]
        try {
            js_target[field_name] = value
        } catch (e) {
            console.log("error",e)
        }
        return NilObj()
    }))
    ROOT._make_method_slot('jsGet:on:',NatMeth((rec:Obj, args:Array<Obj>):Obj => {
        let field_name = args[0]._get_js_string()
        let js_target = args[1]
        try {
            let value = js_target[field_name]
            if(typeof value == 'string') {
                return StrObj(value)
            }
        } catch (e) {
            console.log("error",e)
        }
        return NilObj()
    }))
    ROOT._make_method_slot("jsCall:on:",NatMeth((rec:Obj,args:Array<Obj>):Obj => {
        let method_name = args[0]._get_js_string()
        let js_target = args[1]
        try {
            return js_target[method_name]()
        } catch (e) {
            console.log("error",e)
        }
        return NilObj()
    }))
    ROOT._make_method_slot("jsCall:on:with:",NatMeth((rec:Obj,args:Array<Obj>):Obj => {
        let method_name = args[0]._get_js_string()
        let js_target = args[1]
        try {
            return js_target[method_name](args[2])
        } catch (e) {
            console.log("error",e)
        }
        return StrObj("this is a string")
    }))
    ROOT._make_method_slot("jsCall:on:with:with:",NatMeth((rec:Obj,args:Array<Obj>):Obj => {
        let method_name = args[0]._get_js_string()
        let js_target = args[1]
        try {
            return js_target[method_name](args[2], args[3])
        } catch (e) {
            console.log("error",e)
        }
        return NilObj()
    }))
    ROOT._make_method_slot('jsLookupGlobal:',NatMeth((rec:Obj, args:Array<Obj>)=> global[args[0]._get_js_string()]))
}

export function make_common_scope():Obj {
    let scope = new Obj("Global", ROOT, {});
    setup_object(scope)
    setup_number(scope)
    setup_boolean(scope)
    setup_debug(scope)
    setup_arrays(scope)

    scope._make_method_slot("Global", scope)
    ObjectProto.parent = scope;

    root_fixup(scope);
    //at this point we can do eval

    return scope
}
