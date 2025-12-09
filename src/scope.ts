import {NativeMethodProto, NatMeth, Obj, ObjectProto, ROOT, setup_object} from "./obj.ts";
import {setup_number} from "./number.ts";
import {BoolObj, setup_boolean} from "./boolean.ts";
import {DictObj, ListObj, setup_arrays} from "./arrays.ts";
import {setup_debug} from "./debug.ts";
import {StrObj} from "./string.ts";
import {sval} from "./eval.ts";

function root_fixup(scope:Obj) {
    ROOT._make_method_slot('listSlotNames',NatMeth((rec:Obj, args:Array<Obj>):Obj => {
        let names = rec.list_slot_names().map(name => StrObj(name))
        return ListObj(...names)
    }))
    ROOT._make_method_slot('getSlotNames',NatMeth((rec:Obj, args:Array<Obj>):Obj => {
        let slots:Record<string, Obj> = {}
        rec.list_slot_names().forEach(name => {
            slots[name] = rec.get_slot(name)
        })
        return DictObj(slots)
    }))
    ROOT._make_method_slot('print',NatMeth((rec:Obj):Obj => StrObj(rec.print())))
    NativeMethodProto._make_method_slot('print', NatMeth((rec: Obj, args: Array<Obj>) => {
        return StrObj('native-method')
    }))
    ROOT._make_method_slot('isNil',NatMeth((rec:Obj):Obj => BoolObj(false)))
}

export function make_common_scope():Obj {
    console.log("doing setup common")
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

    sval(`Number makeSlot: 'double' with: [
      (self value) * 2.
    ].`,scope);

    sval(`Nil makeSlot: 'isNil' with: [
         true
      ].
    `,scope)

    return scope
}
