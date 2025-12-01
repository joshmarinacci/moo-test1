import {setup_arrays} from "./arrays.ts";
import {Obj, ObjectProto, ROOT, setup_object} from "./obj.ts";
import {setup_number} from "./number.ts";
import {setup_boolean} from "./boolean.ts";
import {setup_debug} from "./debug.ts";
import {setup_dom} from "./dom.ts";

export function make_browser_scope():Obj {
    let scope = new Obj("Global",ROOT,{});
    setup_object(scope)
    setup_number(scope)
    setup_boolean(scope)
    setup_debug(scope)
    setup_arrays(scope)
    setup_dom(scope)
    scope._make_method_slot("Global",scope)
    ObjectProto.parent = scope;
    return scope
}
