import {JS_VALUE, make_native_obj, NilObj, Obj, ObjectProto} from "./obj.ts";
import {eval_block_obj, eval_statements} from "./eval.ts";


export function setup_dom(scope: Obj, document: Document) {
    console.log("dom proxy setup with ",document)
    const $ = (sel:string):Element => document.querySelector(sel)
    const on = (el:Element,type:string,cb:unknown) => el.addEventListener(type,cb)
    const DomElementProto = make_native_obj("DomElement",ObjectProto,{
        'onClick:':(rec:Obj,args:Array<Obj>):Obj=>{
            let element = rec._get_js_unknown() as Element
            let block = args[0]
            element.addEventListener('click',() => {
                let ret = eval_block_obj(block,[]) as Obj
            })
            return NilObj()
        },
        'addClass:':(rec:Obj, args:Array<Obj>):Obj=>{
            let element = rec._get_js_unknown() as Element
            let classname = args[0]._get_js_string()
            element.classList.add(classname)
            return NilObj()
        },
    })

    const DomProxyProto = make_native_obj("DomProxyProto",ObjectProto,{
        'init':(rec:Obj, args:Array<Obj>):Obj => {
            console.log("DomProxy.init: setting up the dom proxy")
            const editorRoot = document.createElement('div')
            editorRoot.id = "editor-root";
            document.body.appendChild(editorRoot);

            const editorContent = document.createElement('div')
            editorContent.id = "editor-content";
            editorRoot.appendChild(editorContent);

            const editorConsole = document.createElement('li')
            editorConsole.id = "editor-console";
            editorConsole.innerHTML = "";
            editorRoot.appendChild(editorConsole);
            return NilObj()
        },
        'document':(rec:Obj, args:Array<Obj>):Obj => {
            return rec._get_js_record()
        },
        'makeButton:': (rec:Obj, args:Array<Obj>):Obj => {
            let element = document.createElement("button")
            element.innerText = args[0]._get_js_string()
            let object = new Obj("DomElement",DomElementProto,{})
            object._make_js_slot(JS_VALUE,element)
            return object
        },
        'make:':(rec:Obj, args:Array<Obj>):Obj => {
            let tag = args[0]._get_js_string();
            let element = document.createElement(tag)
            let object = new Obj("DomElement",DomElementProto,{})
            object._make_js_slot(JS_VALUE,element)
            return object
        },
        'make:class:':(rec:Obj, args:Array<Obj>):Obj => {
            let tag = args[0]._get_js_string();
            let element = document.createElement(tag)
            element.className = args[1]._get_js_string()
            let object = new Obj("DomElement",DomElementProto,{})
            object._make_js_slot(JS_VALUE,element)
            return object
        },
        'append:':(rec:Obj, args:Array<Obj>):Obj => {
            $("#editor-content").append(args[0]._get_js_unknown() as Element)
            return NilObj()
        },
        "clear":(rec:Obj) => {
            $("#editor-content").innerHTML = ""
            $("#editor-console").innerHTML = ""
            return NilObj()
        }
    });
    if(typeof document != "undefined") {
        DomProxyProto._make_js_slot(JS_VALUE,document)
    }
    scope._make_method_slot("DomProxy",DomProxyProto)
    scope._make_method_slot("DomElement",DomElementProto)
    eval_statements(`
        DomElement understands: "append:" with: [ child |
            self jsCall: "append" on: (self getJsSlot: "_jsvalue") with: (child getJsSlot: "_jsvalue").
        ].
        DomElement understands: "innerHtml:" with: [ str |
            self jsSet: "innerHTML" on: (self getJsSlot: "_jsvalue") with: (str getJsSlot: "_jsvalue").
        ].
        DomElement understands: "innerHtml" with: [|
            self jsGet: "innerHTML" on: (self getJsSlot: "_jsvalue").
        ].
        DomElement understands: "clear" with: [ |
            self jsSet: "innerHTML" on: (self getJsSlot: "_jsvalue") with: ("" getJsSlot: "_jsvalue").
        ].
    `,scope)

}