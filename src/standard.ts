import {DebugProto} from "./eval2.ts";
import {setup_arrays} from "./arrays.ts";
import {NilObj, NilProto, Obj, ObjectProto, ROOT} from "./obj.ts";
import {NumberProto} from "./number.ts";
import {BooleanProto, BoolObj} from "./boolean.ts";
import {setup_image} from "./image.ts";

export function make_standard_scope():Obj {
    let scope = new Obj("Global",ROOT,{});
    scope.make_slot("Object",ObjectProto)
    scope.make_slot("Number",NumberProto)
    scope.make_slot("Debug",DebugProto)
    scope.make_slot("Boolean",BooleanProto)
    scope.make_slot("true",BoolObj(true))
    scope.make_slot("false",BoolObj(false))
    scope.make_slot("Nil",NilProto)
    scope.make_slot('nil',NilObj())
    scope.make_slot("Global",scope)
    ObjectProto.parent = scope;

    setup_image(scope)
    setup_arrays(scope)
    return scope
}
