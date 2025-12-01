import {NilObj, Obj, ObjectProto} from "./obj.ts";

const $ = (sel:string):Element => document.querySelector(sel)
const on = (el:Element,type:string,cb:unknown) => el.addEventListener(type,cb)

export function setup_dom(scope: Obj) {
    const DomProxyProto = new Obj("DomProxyProto",ObjectProto,{
        'init':(rec:Obj, args:Array<Obj>):Obj => {
            console.log("setting up the dom proxy")
            const div = document.createElement('div')
            div.id = "editor-root";
            document.body.appendChild(div);
            return NilObj()
        },
        'document':(rec:Obj) => {
            return rec._get_js_record()
        },
        'makeButton:': (rec:Obj, args:Array<Obj>):Obj => {
            console.log("making a button. cool")
            let button = document.createElement("button")
            button.innerText = args[0]._get_js_string()
            let object = new Obj("domelement",ObjectProto,{})
            object._make_js_slot('jsvalue',button)
            return object
        },
        'append:':(rec:Obj, args:Array<Obj>):Obj => {
            console.log("adding element to the document")
            $("#editor-root").append(args[0]._get_js_unknown() as Element)
            return NilObj()
        }
    });
    if(typeof document != "undefined") {
        DomProxyProto._make_js_slot("jsvalue",document)
    }

    scope._make_method_slot("DomProxy",DomProxyProto)

}